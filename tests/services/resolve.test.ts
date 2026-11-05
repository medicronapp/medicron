import { describe, test, expect } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-db";
import { carePlans, careSlots } from "@/lib/db/schema";
import { createCat } from "@/lib/services/cats";
import { createItem } from "@/lib/services/items";
import { createPlan } from "@/lib/services/plans";
import { resolveSlot, TooEarly } from "@/lib/services/slots";
import { NotFound } from "@/lib/errors";

const z = (s: string) => new Date(s);

async function setup(org = "o1") {
  const db = await createTestDb();
  const cat = await createCat(db, org, { name: "Izzy" });
  const item = await createItem(db, org, { name: "Amoxicilina", kind: "medication" });
  const plan = await createPlan(db, org, {
    catId: cat.id, itemId: item.id, intervalMinutes: 360,
    anchorAt: z("2026-11-04T11:00:00Z"), now: z("2026-11-04T10:00:00Z"),
  });
  return { db, plan };
}
const input = (planId: string, at: string, now: string, extra = {}) =>
  ({ planId, scheduledFor: z(at), outcome: "done" as const, now: z(now), ...extra });

describe("resolveSlot", () => {
  test("exemplo 2: resolve só aquele horário, deixa o das 20:00 pendente e não toca a rotina", async () => {
    const { db, plan } = await setup();
    const before = (await db.select().from(carePlans))[0];
    const r = await resolveSlot(db, "o1", "u1", input(plan.id, "2026-11-04T17:00:00Z", "2026-11-04T23:05:00Z", { value: "38,6", note: "ok" }));
    expect(r).toEqual({ recorded: true });
    const slots = await db.select().from(careSlots).orderBy(careSlots.scheduledFor);
    expect(slots.map((s) => s.outcome)).toEqual([null, "done", null]);
    expect(slots[1]).toMatchObject({ resolvedByUserId: "u1", value: "38,6", note: "ok" });
    expect(slots[1].resolvedAt).toEqual(z("2026-11-04T23:05:00Z"));
    const after = (await db.select().from(carePlans))[0];
    expect(after.nextDueAt).toEqual(before.nextDueAt);
    expect(after.active).toBe(true);
  });

  test("segunda chamada não duplica nem sobrescreve", async () => {
    const { db, plan } = await setup();
    const i = input(plan.id, "2026-11-04T11:00:00Z", "2026-11-04T11:03:00Z");
    expect(await resolveSlot(db, "o1", "u1", i)).toEqual({ recorded: true });
    expect(await resolveSlot(db, "o1", "u2", { ...i, outcome: "skipped" })).toEqual({ recorded: false });
    const [s] = await db.select().from(careSlots).where(eq(careSlots.scheduledFor, z("2026-11-04T11:00:00Z")));
    expect(s).toMatchObject({ outcome: "done", resolvedByUserId: "u1" });
  });

  test("duas chamadas concorrentes: uma grava, a outra recebe recorded:false", async () => {
    const { db, plan } = await setup();
    const i = input(plan.id, "2026-11-04T11:00:00Z", "2026-11-04T11:03:00Z");
    const [a, b] = await Promise.all([resolveSlot(db, "o1", "u1", i), resolveSlot(db, "o1", "u2", i)]);
    expect([a.recorded, b.recorded].sort()).toEqual([false, true]);
  });

  test("horário além de agora + 15 min lança TooEarly e nada é gravado", async () => {
    const { db, plan } = await setup();
    await expect(resolveSlot(db, "o1", "u1", input(plan.id, "2026-11-04T23:00:00Z", "2026-11-04T11:03:00Z"))).rejects.toBeInstanceOf(TooEarly);
    expect((await db.select().from(careSlots)).every((s) => s.outcome === null)).toBe(true);
  });

  test("até 15 min antes do horário já pode resolver ('agora')", async () => {
    const { db, plan } = await setup();
    expect(await resolveSlot(db, "o1", "u1", input(plan.id, "2026-11-04T11:00:00Z", "2026-11-04T10:46:00Z"))).toEqual({ recorded: true });
  });

  test("rotina de outra conta ou horário que não é slot lança NotFound", async () => {
    const { db, plan } = await setup();
    await expect(resolveSlot(db, "o2", "u1", input(plan.id, "2026-11-04T11:00:00Z", "2026-11-04T11:03:00Z"))).rejects.toBeInstanceOf(NotFound);
    await expect(resolveSlot(db, "o1", "u1", input(plan.id, "2026-11-04T12:00:00Z", "2026-11-04T23:03:00Z"))).rejects.toBeInstanceOf(NotFound);
  });

  test("resolver depois da janela de solução ainda grava", async () => {
    const { db, plan } = await setup();
    expect(await resolveSlot(db, "o1", "u1", input(plan.id, "2026-11-04T11:00:00Z", "2026-11-09T12:00:00Z"))).toEqual({ recorded: true });
  });
});
