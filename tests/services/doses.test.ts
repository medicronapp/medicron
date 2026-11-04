import { describe, test, expect } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-db";
import { carePlans, doseLogs, user } from "@/lib/db/schema";
import { createCat, archiveCat } from "@/lib/services/cats";
import { createItem } from "@/lib/services/items";
import { createPlan } from "@/lib/services/plans";
import { listAgenda, recordDose, listRecentLogs } from "@/lib/services/doses";
import { NotFound } from "@/lib/errors";

const d = (s: string) => new Date(s);

async function setup(opts: { anchor?: string; interval?: number; endAt?: string; now?: string } = {}) {
  const db = await createTestDb();
  const now = d(opts.now ?? "2026-11-04T07:00:00Z");
  await db.insert(user).values({ id: "u1", name: "Ana", email: "a@x.com" });
  const cat = await createCat(db, "o1", { name: "Mimi" });
  const item = await createItem(db, "o1", { name: "Amoxicilina", kind: "medication" });
  const plan = await createPlan(db, "o1", {
    catId: cat.id, itemId: item.id, intervalMinutes: opts.interval ?? 480,
    anchorAt: d(opts.anchor ?? "2026-11-04T08:00:00Z"),
    endAt: opts.endAt ? d(opts.endAt) : undefined, now,
  });
  return { db, cat, item, plan, now };
}

describe("listAgenda", () => {
  test("separa atrasadas, agora e próximas; ignora fora do horizonte", async () => {
    const { db } = await setup({ anchor: "2026-11-04T06:00:00Z", interval: 1440, now: "2026-11-03T05:00:00Z" });
    // plano devido 06:00Z
    const at = (s: string) => listAgenda(db, "o1", d(s));
    expect((await at("2026-11-04T07:00:00Z")).overdue).toHaveLength(1);        // 60 min depois
    expect((await at("2026-11-04T06:10:00Z")).dueNow).toHaveLength(1);         // dentro de 15 min
    expect((await at("2026-11-04T05:50:00Z")).dueNow).toHaveLength(1);
    expect((await at("2026-11-04T01:00:00Z")).upcoming).toHaveLength(1);
    const far = await at("2026-11-03T01:00:00Z");
    expect([far.overdue, far.dueNow, far.upcoming].flat()).toHaveLength(0);
  });

  test("ignora plano inativo, gato arquivado e endAt vencido", async () => {
    const a = await setup();
    await archiveCat(a.db, "o1", a.cat.id);
    const r = await listAgenda(a.db, "o1", d("2026-11-04T08:00:00Z"));
    expect([r.overdue, r.dueNow, r.upcoming].flat()).toHaveLength(0);

    const b = await setup();
    await b.db.update(carePlans).set({ endAt: d("2026-11-04T07:30:00Z") });
    const r2 = await listAgenda(b.db, "o1", d("2026-11-04T08:00:00Z"));
    expect([r2.overdue, r2.dueNow, r2.upcoming].flat()).toHaveLength(0);
  });

  test("não mostra planos de outra organização", async () => {
    const { db } = await setup();
    const r = await listAgenda(db, "o2", d("2026-11-04T08:00:00Z"));
    expect([r.overdue, r.dueNow, r.upcoming].flat()).toHaveLength(0);
  });
});

describe("recordDose", () => {
  test("registra e avança para o próximo slot depois de agora", async () => {
    const { db, plan } = await setup();
    const res = await recordDose(db, "o1", "u1", {
      planId: plan.id, scheduledFor: plan.nextDueAt, outcome: "done", now: d("2026-11-04T08:10:00Z"),
    });
    expect(res).toEqual({ recorded: true, nextDueAt: d("2026-11-04T16:00:00Z") });
    expect(await db.select().from(doseLogs)).toHaveLength(1);
  });

  test("marcar antes da hora não repete o mesmo slot", async () => {
    const { db, plan } = await setup();
    const res = await recordDose(db, "o1", "u1", {
      planId: plan.id, scheduledFor: plan.nextDueAt, outcome: "done", now: d("2026-11-04T07:30:00Z"),
    });
    expect(res.nextDueAt).toEqual(d("2026-11-04T16:00:00Z"));
  });

  test("segunda chamada com o mesmo slot não duplica", async () => {
    const { db, plan } = await setup();
    const input = { planId: plan.id, scheduledFor: plan.nextDueAt, outcome: "done" as const, now: d("2026-11-04T08:10:00Z") };
    await recordDose(db, "o1", "u1", input);
    const again = await recordDose(db, "o1", "u1", input);
    expect(again.recorded).toBe(false);
    expect(await db.select().from(doseLogs)).toHaveLength(1);
  });

  test("duas chamadas concorrentes registram uma única dose", async () => {
    const { db, plan } = await setup();
    const input = { planId: plan.id, scheduledFor: plan.nextDueAt, outcome: "done" as const, now: d("2026-11-04T08:10:00Z") };
    const [a, b] = await Promise.all([recordDose(db, "o1", "u1", input), recordDose(db, "o1", "u1", input)]);
    expect([a.recorded, b.recorded].sort()).toEqual([false, true]);
    expect(await db.select().from(doseLogs)).toHaveLength(1);
  });

  test("última dose antes do endAt desativa o plano", async () => {
    const { db, plan } = await setup({ endAt: "2026-11-04T09:00:00Z" });
    const res = await recordDose(db, "o1", "u1", {
      planId: plan.id, scheduledFor: plan.nextDueAt, outcome: "skipped", now: d("2026-11-04T08:05:00Z"),
    });
    expect(res).toEqual({ recorded: true, nextDueAt: null });
    const [p] = await db.select().from(carePlans).where(eq(carePlans.id, plan.id));
    expect(p.active).toBe(false);
  });

  test("plano de outra organização lança NotFound", async () => {
    const { db, plan } = await setup();
    await expect(
      recordDose(db, "o2", "u1", { planId: plan.id, scheduledFor: plan.nextDueAt, outcome: "done" }),
    ).rejects.toBeInstanceOf(NotFound);
  });

  test("guarda valor e observação e aparece no histórico", async () => {
    const { db, plan } = await setup();
    await recordDose(db, "o1", "u1", {
      planId: plan.id, scheduledFor: plan.nextDueAt, outcome: "done", value: "38,7 °C", note: "calmo", now: d("2026-11-04T08:10:00Z"),
    });
    const logs = await listRecentLogs(db, "o1", 10);
    expect(logs[0]).toMatchObject({ value: "38,7 °C", note: "calmo", catName: "Mimi", itemName: "Amoxicilina", userName: "Ana" });
    expect(await listRecentLogs(db, "o2", 10)).toEqual([]);
  });
});
