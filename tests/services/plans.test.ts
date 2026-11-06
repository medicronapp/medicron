import { describe, test, expect } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { createCat } from "@/lib/services/cats";
import { createItem } from "@/lib/services/items";
import { createPlan, listPlansForCat, updatePlan, deactivatePlan, setPlanReschedule } from "@/lib/services/plans";
import { NotFound } from "@/lib/errors";

const d = (s: string) => new Date(s);
const now = d("2026-11-04T07:00:00Z");

async function setup() {
  const db = await createTestDb();
  const cat = await createCat(db, "o1", { name: "Mimi" });
  const item = await createItem(db, "o1", { name: "Amoxicilina", kind: "medication", defaultDose: "1 comprimido" });
  return { db, cat, item };
}

describe("plans", () => {
  test("âncora futura vira a primeira dose e a dose padrão do item é herdada", async () => {
    const { db, cat, item } = await setup();
    const plan = await createPlan(db, "o1", {
      catId: cat.id, itemId: item.id, intervalMinutes: 480, anchorAt: d("2026-11-04T08:00:00Z"), now,
    });
    expect(plan.nextDueAt).toEqual(d("2026-11-04T08:00:00Z"));
    expect(plan.dose).toBe("1 comprimido");
  });

  test("âncora no passado usa o próximo slot futuro", async () => {
    const { db, cat, item } = await setup();
    const plan = await createPlan(db, "o1", {
      catId: cat.id, itemId: item.id, intervalMinutes: 480, anchorAt: d("2026-11-03T08:00:00Z"), now,
    });
    expect(plan.nextDueAt).toEqual(d("2026-11-04T08:00:00Z"));
  });

  test("gato ou item de outra organização lança NotFound", async () => {
    const { db, cat, item } = await setup();
    await expect(
      createPlan(db, "o2", { catId: cat.id, itemId: item.id, intervalMinutes: 60, anchorAt: now, now }),
    ).rejects.toBeInstanceOf(NotFound);
  });

  test("intervalo 0 e endAt anterior à primeira dose são rejeitados", async () => {
    const { db, cat, item } = await setup();
    await expect(
      createPlan(db, "o1", { catId: cat.id, itemId: item.id, intervalMinutes: 0, anchorAt: now, now }),
    ).rejects.toThrow();
    await expect(
      createPlan(db, "o1", {
        catId: cat.id, itemId: item.id, intervalMinutes: 60, anchorAt: d("2026-11-04T08:00:00Z"),
        endAt: d("2026-11-04T07:30:00Z"), now,
      }),
    ).rejects.toThrow();
  });

  test("listPlansForCat traz só planos ativos da org, com o item", async () => {
    const { db, cat, item } = await setup();
    const a = await createPlan(db, "o1", { catId: cat.id, itemId: item.id, intervalMinutes: 60, anchorAt: now, now });
    const b = await createPlan(db, "o1", { catId: cat.id, itemId: item.id, intervalMinutes: 120, anchorAt: now, now });
    await deactivatePlan(db, "o1", b.id);
    const list = await listPlansForCat(db, "o1", cat.id);
    expect(list.map((p) => p.id)).toEqual([a.id]);
    expect(list[0].item.name).toBe("Amoxicilina");
    expect(await listPlansForCat(db, "o2", cat.id)).toEqual([]);
  });

  test("updatePlan recalcula nextDueAt ao mudar o intervalo; outra org vira NotFound", async () => {
    const { db, cat, item } = await setup();
    const plan = await createPlan(db, "o1", {
      catId: cat.id, itemId: item.id, intervalMinutes: 480, anchorAt: d("2026-11-04T08:00:00Z"), now,
    });
    const upd = await updatePlan(db, "o1", plan.id, { intervalMinutes: 720, anchorAt: d("2026-11-04T10:00:00Z"), now });
    expect(upd.nextDueAt).toEqual(d("2026-11-04T10:00:00Z"));
    await expect(updatePlan(db, "o2", plan.id, { dose: "x" })).rejects.toBeInstanceOf(NotFound);
  });
});

describe("plans: reprogramar horários", () => {
  test("reschedule é falso por padrão e verdadeiro quando informado", async () => {
    const { db, cat, item } = await setup();
    const base = { catId: cat.id, itemId: item.id, intervalMinutes: 480, anchorAt: d("2026-11-04T08:00:00Z"), now };
    expect((await createPlan(db, "o1", base)).reschedule).toBe(false);
    expect((await createPlan(db, "o1", { ...base, reschedule: true })).reschedule).toBe(true);
  });
});

describe("plans: alterar reprogramação", () => {
  test("liga e desliga sem mexer nos horários", async () => {
    const { db, cat, item } = await setup();
    const plan = await createPlan(db, "o1", {
      catId: cat.id, itemId: item.id, intervalMinutes: 480, anchorAt: d("2026-11-04T08:00:00Z"), now,
    });
    const on = await setPlanReschedule(db, "o1", plan.id, true);
    expect(on.reschedule).toBe(true);
    expect(on.anchorAt).toEqual(plan.anchorAt);
    expect(on.nextDueAt).toEqual(plan.nextDueAt);
    expect((await setPlanReschedule(db, "o1", plan.id, false)).reschedule).toBe(false);
  });

  test("rotina de outra organização lança NotFound", async () => {
    const { db, cat, item } = await setup();
    const plan = await createPlan(db, "o1", {
      catId: cat.id, itemId: item.id, intervalMinutes: 480, anchorAt: d("2026-11-04T08:00:00Z"), now,
    });
    await expect(setPlanReschedule(db, "o2", plan.id, true)).rejects.toBeInstanceOf(NotFound);
  });
});
