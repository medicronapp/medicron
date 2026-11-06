import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/lib/db";
import { carePlans, careSlots, patients, items, type CarePlan, type Item } from "@/lib/db/schema";
import { NotFound } from "@/lib/errors";
import { firstDueAt } from "@/lib/schedule";
import { getPatient } from "@/lib/services/patients";
import { getItem } from "@/lib/services/items";
import { ensureSlots } from "@/lib/services/slots";

const interval = z.number().int().min(5, "Intervalo mínimo de 5 minutos").max(60 * 24 * 365);

const planInput = z.object({
  patientId: z.string().min(1),
  itemId: z.string().min(1),
  intervalMinutes: interval,
  anchorAt: z.date(),
  endAt: z.date().optional(),
  dose: z.string().trim().max(120).optional(),
  reschedule: z.boolean().optional(),
});
export type PlanInput = z.input<typeof planInput> & { now?: Date };

export async function createPlan(db: Db, orgId: string, input: PlanInput): Promise<CarePlan> {
  const { now = new Date(), ...rest } = input;
  const p = planInput.parse(rest);
  const [patient, item] = await Promise.all([getPatient(db, orgId, p.patientId), getItem(db, orgId, p.itemId)]);
  if (!patient) throw new NotFound("Paciente");
  if (!item) throw new NotFound("Item");
  const nextDueAt = firstDueAt(p.anchorAt, p.intervalMinutes, now);
  if (p.endAt && p.endAt.getTime() < nextDueAt.getTime()) {
    throw new Error("A data final é anterior à primeira dose");
  }
  const [row] = await db.insert(carePlans).values({
    organizationId: orgId, patientId: patient.id, itemId: item.id,
    intervalMinutes: p.intervalMinutes, anchorAt: p.anchorAt, endAt: p.endAt ?? null,
    dose: p.dose || item.defaultDose, reschedule: p.reschedule ?? false, nextDueAt, startsAt: nextDueAt,
  }).returning();
  return row;
}

export type PlanWithItem = CarePlan & { item: Item };

export async function listPlansForPatient(db: Db, orgId: string, patientId: string): Promise<PlanWithItem[]> {
  const rows = await db
    .select({ plan: carePlans, item: items })
    .from(carePlans)
    .innerJoin(items, eq(items.id, carePlans.itemId))
    .innerJoin(patients, eq(patients.id, carePlans.patientId))
    .where(and(
      eq(carePlans.organizationId, orgId), eq(carePlans.patientId, patientId), eq(carePlans.active, true),
      isNull(items.archivedAt), isNull(patients.archivedAt),
    ))
    .orderBy(asc(carePlans.nextDueAt));
  return rows.map((r) => ({ ...r.plan, item: r.item }));
}

export type PlanPatch = {
  intervalMinutes?: number; anchorAt?: Date; endAt?: Date | null; dose?: string | null; reschedule?: boolean; now?: Date;
};

export async function updatePlan(db: Db, orgId: string, id: string, patch: PlanPatch): Promise<CarePlan> {
  const [cur] = await db.select().from(carePlans)
    .where(and(eq(carePlans.id, id), eq(carePlans.organizationId, orgId))).limit(1);
  if (!cur) throw new NotFound("Plano");
  const intervalMinutes = patch.intervalMinutes === undefined ? cur.intervalMinutes : interval.parse(patch.intervalMinutes);
  const anchorAt = patch.anchorAt ?? cur.anchorAt;
  const endAt = patch.endAt === undefined ? cur.endAt : patch.endAt;
  const endChanged = (endAt?.getTime() ?? null) !== (cur.endAt?.getTime() ?? null);
  const scheduleChanged =
    intervalMinutes !== cur.intervalMinutes || anchorAt.getTime() !== cur.anchorAt.getTime() || endChanged;
  const nextDueAt = scheduleChanged ? firstDueAt(anchorAt, intervalMinutes, patch.now ?? new Date()) : cur.nextDueAt;
  if (endAt && endAt.getTime() < nextDueAt.getTime()) throw new Error("A data final é anterior à próxima dose");
  const now = patch.now ?? new Date();
  // Congela o passado com a grade antiga antes de trocar a rotina.
  if (scheduleChanged) await ensureSlots(db, now, orgId);
  return db.transaction(async (tx) => {
    let schedule: { startsAt?: Date; slotsThrough?: Date | null } = {};
    if (scheduleChanged) {
      await tx.delete(careSlots).where(and(
        eq(careSlots.carePlanId, id), isNull(careSlots.outcome), gt(careSlots.scheduledFor, now),
      ));
      const [last] = await tx
        .select({ at: sql`max(${careSlots.scheduledFor})`.mapWith(careSlots.scheduledFor) })
        .from(careSlots).where(eq(careSlots.carePlanId, id));
      schedule = { startsAt: nextDueAt, slotsThrough: last?.at ?? null };
    }
    const [row] = await tx.update(carePlans).set({
      intervalMinutes, anchorAt, endAt, nextDueAt, ...schedule,
      dose: patch.dose === undefined ? cur.dose : patch.dose,
      reschedule: patch.reschedule ?? cur.reschedule,
    }).where(and(eq(carePlans.id, id), eq(carePlans.organizationId, orgId))).returning();
    return row;
  });
}

/** Encerra a rotina: deixa de esperar cuidados dali em diante (apaga os horários futuros não resolvidos). */
export async function deactivatePlan(db: Db, orgId: string, id: string, now: Date = new Date()): Promise<void> {
  await db.transaction(async (tx) => {
    const done = await tx.update(carePlans).set({ active: false })
      .where(and(eq(carePlans.id, id), eq(carePlans.organizationId, orgId))).returning({ id: carePlans.id });
    if (done.length === 0) return;
    await tx.delete(careSlots).where(and(
      eq(careSlots.carePlanId, id), isNull(careSlots.outcome), gt(careSlots.scheduledFor, now),
    ));
  });
}
