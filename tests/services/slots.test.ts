import { describe, test, expect } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-db";
import { carePlans, careSlots } from "@/lib/db/schema";
import { createCat, archiveCat } from "@/lib/services/cats";
import { createItem, archiveItem } from "@/lib/services/items";
import { createPlan } from "@/lib/services/plans";
import { ensureSlots } from "@/lib/services/slots";

const z = (s: string) => new Date(s);
const times = async (db: Awaited<ReturnType<typeof createTestDb>>) =>
  (await db.select().from(careSlots).orderBy(careSlots.scheduledFor)).map((s) => s.scheduledFor.toISOString());

async function setup(opts: { interval?: number; anchor?: string; createdAt?: string; endAt?: string; org?: string } = {}) {
  const db = await createTestDb();
  const org = opts.org ?? "o1";
  const cat = await createCat(db, org, { name: "Izzy" });
  const item = await createItem(db, org, { name: "Amoxicilina", kind: "medication" });
  const plan = await createPlan(db, org, {
    catId: cat.id, itemId: item.id, intervalMinutes: opts.interval ?? 360,
    anchorAt: z(opts.anchor ?? "2026-11-04T11:00:00Z"), now: z(opts.createdAt ?? "2026-11-04T10:00:00Z"),
    endAt: opts.endAt ? z(opts.endAt) : undefined,
  });
  return { db, cat, item, plan };
}

describe("ensureSlots", () => {
  test("exemplo 1: gera 08:00, 14:00 e 20:00 BRT e não o das 02:00 do dia seguinte", async () => {
    const { db } = await setup();
    await ensureSlots(db, z("2026-11-04T23:00:00Z"));
    expect(await times(db)).toEqual(["2026-11-04T11:00:00.000Z", "2026-11-04T17:00:00.000Z", "2026-11-04T23:00:00.000Z"]);
  });

  test("é idempotente e seguro sob chamadas concorrentes", async () => {
    const { db } = await setup();
    const now = z("2026-11-04T23:00:00Z");
    await Promise.all([ensureSlots(db, now), ensureSlots(db, now)]);
    expect(await ensureSlots(db, now)).toBe(0);
    expect(await db.select().from(careSlots)).toHaveLength(3);
  });

  test("exemplo 5: rotina criada às 15:00 BRT com âncora 08:00 não gera 08:00 nem 14:00", async () => {
    const { db } = await setup({ createdAt: "2026-11-04T18:00:00Z" });
    await ensureSlots(db, z("2026-11-04T23:30:00Z"));
    expect(await times(db)).toEqual(["2026-11-04T23:00:00.000Z"]);
  });

  test("endAt limita os horários gerados", async () => {
    const { db } = await setup({ endAt: "2026-11-04T18:00:00Z" });
    await ensureSlots(db, z("2026-11-04T23:00:00Z"));
    expect(await times(db)).toEqual(["2026-11-04T11:00:00.000Z", "2026-11-04T17:00:00.000Z"]);
  });

  test("rotina inativa, de gato arquivado ou de item arquivado não gera", async () => {
    const a = await setup();
    await a.db.update(carePlans).set({ active: false });
    expect(await ensureSlots(a.db, z("2026-11-04T23:00:00Z"))).toBe(0);
    const b = await setup();
    await archiveCat(b.db, "o1", b.cat.id);
    expect(await ensureSlots(b.db, z("2026-11-04T23:00:00Z"))).toBe(0);
    const c = await setup();
    await archiveItem(c.db, "o1", c.item.id);
    expect(await ensureSlots(c.db, z("2026-11-04T23:00:00Z"))).toBe(0);
  });

  test("rotina semanal gera um slot por semana e dias intermediários ficam sem slot", async () => {
    const { db } = await setup({ interval: 10080 });
    await ensureSlots(db, z("2026-11-04T23:00:00Z"));
    await ensureSlots(db, z("2026-11-05T15:00:00Z"));
    expect(await db.select().from(careSlots)).toHaveLength(1);
    await ensureSlots(db, z("2026-11-11T15:00:00Z"));
    expect(await db.select().from(careSlots)).toHaveLength(2);
  });

  test("em outro dia cria os horários do novo dia sem repetir os antigos", async () => {
    const { db } = await setup();
    await ensureSlots(db, z("2026-11-04T23:00:00Z"));
    await ensureSlots(db, z("2026-11-05T12:00:00Z"));
    expect(await times(db)).toEqual([
      "2026-11-04T11:00:00.000Z", "2026-11-04T17:00:00.000Z", "2026-11-04T23:00:00.000Z",
      "2026-11-05T05:00:00.000Z", "2026-11-05T11:00:00.000Z", "2026-11-05T17:00:00.000Z", "2026-11-05T23:00:00.000Z",
    ]);
  });

  test("orgId restringe a geração à conta", async () => {
    const a = await setup({ org: "o1" });
    expect(await ensureSlots(a.db, z("2026-11-04T23:00:00Z"), "o2")).toBe(0);
    expect(await ensureSlots(a.db, z("2026-11-04T23:00:00Z"), "o1")).toBe(3);
  });

  test("backlog grande é gerado em lotes de no máximo 1000 por rotina", async () => {
    const { db } = await setup({ interval: 5, anchor: "2026-01-01T00:00:00Z", createdAt: "2026-01-01T00:00:00Z" });
    expect(await ensureSlots(db, z("2026-11-04T23:00:00Z"))).toBe(1000);
    expect(await ensureSlots(db, z("2026-11-04T23:00:00Z"))).toBe(1000);
    const [plan] = await db.select().from(carePlans);
    expect(plan.slotsThrough).not.toBeNull();
  });
});

describe("congelamento ao editar rotina", () => {
  test("exemplo 6: editar o intervalo mantém passados e resolvidos, apaga futuros não resolvidos e regenera pela nova grade", async () => {
    const { db, plan } = await setup();
    const { updatePlan } = await import("@/lib/services/plans");
    const now = z("2026-11-04T14:00:00Z"); // 11:00 BRT
    await ensureSlots(db, now);
    await db.update(careSlots).set({ outcome: "done", resolvedAt: now }).where(eq(careSlots.scheduledFor, z("2026-11-04T11:00:00Z")));
    await updatePlan(db, "o1", plan.id, { intervalMinutes: 480, now });
    expect(await times(db)).toEqual(["2026-11-04T11:00:00.000Z"]);
    await ensureSlots(db, now);
    expect(await times(db)).toEqual(["2026-11-04T11:00:00.000Z", "2026-11-04T19:00:00.000Z"]);
  });

  test("editar mantém slot passado não resolvido (continua sem registro)", async () => {
    const { db, plan } = await setup();
    const { updatePlan } = await import("@/lib/services/plans");
    const now = z("2026-11-04T18:00:00Z");
    await updatePlan(db, "o1", plan.id, { intervalMinutes: 720, now });
    expect(await times(db)).toEqual(["2026-11-04T11:00:00.000Z", "2026-11-04T17:00:00.000Z"]);
  });
});

describe("editar só a data final (I3)", () => {
  test("encurtar apaga os horários futuros depois do novo fim", async () => {
    const { db, plan } = await setup();
    const { updatePlan } = await import("@/lib/services/plans");
    const now = z("2026-11-04T12:00:00Z");
    await ensureSlots(db, now);
    await updatePlan(db, "o1", plan.id, { endAt: z("2026-11-04T18:00:00Z"), now });
    expect(await times(db)).not.toContain("2026-11-04T23:00:00.000Z");
    await ensureSlots(db, now);
    expect(await times(db)).toEqual(["2026-11-04T11:00:00.000Z", "2026-11-04T17:00:00.000Z"]);
  });

  test("estender rotina já terminada não preenche o intervalo passado com 'sem registro'", async () => {
    const { db, plan } = await setup({ endAt: "2026-11-04T18:00:00Z" });
    const { updatePlan } = await import("@/lib/services/plans");
    await ensureSlots(db, z("2026-11-04T23:00:00Z"));
    const now = z("2026-11-06T12:00:00Z");
    await updatePlan(db, "o1", plan.id, { endAt: null, now });
    await ensureSlots(db, now);
    const all = (await db.select().from(careSlots)).map((s) => s.scheduledFor);
    const novos = all.filter((t) => t.getTime() > z("2026-11-04T18:00:00Z").getTime());
    expect(novos.length).toBeGreaterThan(0);
    expect(novos.every((t) => t.getTime() > now.getTime())).toBe(true);
  });
});
