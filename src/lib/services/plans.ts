import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/lib/db";
import { carePlans, cats, items, type CarePlan, type Item } from "@/lib/db/schema";
import { NotFound } from "@/lib/errors";
import { firstDueAt } from "@/lib/schedule";
import { getCat } from "@/lib/services/cats";
import { getItem } from "@/lib/services/items";

const interval = z.number().int().min(5, "Intervalo mínimo de 5 minutos").max(60 * 24 * 365);

const planInput = z.object({
  catId: z.string().min(1),
  itemId: z.string().min(1),
  intervalMinutes: interval,
  anchorAt: z.date(),
  endAt: z.date().optional(),
  dose: z.string().trim().max(120).optional(),
});
export type PlanInput = z.input<typeof planInput> & { now?: Date };

export async function createPlan(db: Db, orgId: string, input: PlanInput): Promise<CarePlan> {
  const { now = new Date(), ...rest } = input;
  const p = planInput.parse(rest);
  const [cat, item] = await Promise.all([getCat(db, orgId, p.catId), getItem(db, orgId, p.itemId)]);
  if (!cat) throw new NotFound("Gato");
  if (!item) throw new NotFound("Item");
  const nextDueAt = firstDueAt(p.anchorAt, p.intervalMinutes, now);
  if (p.endAt && p.endAt.getTime() < nextDueAt.getTime()) {
    throw new Error("A data final é anterior à primeira dose");
  }
  const [row] = await db.insert(carePlans).values({
    organizationId: orgId, catId: cat.id, itemId: item.id,
    intervalMinutes: p.intervalMinutes, anchorAt: p.anchorAt, endAt: p.endAt ?? null,
    dose: p.dose || item.defaultDose, nextDueAt,
  }).returning();
  return row;
}

export type PlanWithItem = CarePlan & { item: Item };

export async function listPlansForCat(db: Db, orgId: string, catId: string): Promise<PlanWithItem[]> {
  const rows = await db
    .select({ plan: carePlans, item: items })
    .from(carePlans)
    .innerJoin(items, eq(items.id, carePlans.itemId))
    .innerJoin(cats, eq(cats.id, carePlans.catId))
    .where(and(
      eq(carePlans.organizationId, orgId), eq(carePlans.catId, catId), eq(carePlans.active, true),
      isNull(items.archivedAt), isNull(cats.archivedAt),
    ))
    .orderBy(asc(carePlans.nextDueAt));
  return rows.map((r) => ({ ...r.plan, item: r.item }));
}

export type PlanPatch = {
  intervalMinutes?: number; anchorAt?: Date; endAt?: Date | null; dose?: string | null; now?: Date;
};

export async function updatePlan(db: Db, orgId: string, id: string, patch: PlanPatch): Promise<CarePlan> {
  const [cur] = await db.select().from(carePlans)
    .where(and(eq(carePlans.id, id), eq(carePlans.organizationId, orgId))).limit(1);
  if (!cur) throw new NotFound("Plano");
  const intervalMinutes = patch.intervalMinutes === undefined ? cur.intervalMinutes : interval.parse(patch.intervalMinutes);
  const anchorAt = patch.anchorAt ?? cur.anchorAt;
  const endAt = patch.endAt === undefined ? cur.endAt : patch.endAt;
  const scheduleChanged = intervalMinutes !== cur.intervalMinutes || anchorAt.getTime() !== cur.anchorAt.getTime();
  const nextDueAt = scheduleChanged ? firstDueAt(anchorAt, intervalMinutes, patch.now ?? new Date()) : cur.nextDueAt;
  if (endAt && endAt.getTime() < nextDueAt.getTime()) throw new Error("A data final é anterior à próxima dose");
  const [row] = await db.update(carePlans).set({
    intervalMinutes, anchorAt, endAt, nextDueAt,
    dose: patch.dose === undefined ? cur.dose : patch.dose,
  }).where(and(eq(carePlans.id, id), eq(carePlans.organizationId, orgId))).returning();
  return row;
}

export async function deactivatePlan(db: Db, orgId: string, id: string): Promise<void> {
  await db.update(carePlans).set({ active: false })
    .where(and(eq(carePlans.id, id), eq(carePlans.organizationId, orgId)));
}
