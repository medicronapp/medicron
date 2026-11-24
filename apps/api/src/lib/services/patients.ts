import { and, asc, eq, gt, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { invalidateWakeHint } from "@/lib/wake-store";
import type { Db } from "@/lib/db";
import { patients, carePlans, careSlots, type Patient } from "@/lib/db/schema";
import { firstDueAt } from "@/lib/schedule";

export const patientInput = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(60),
  birthDate: z.string().date().optional(),
  weightKg: z.number().positive().max(500).optional(),
  species: z.enum(["cat", "dog", "human", "bird", "rabbit", "other"]).default("other"),
  notes: z.string().trim().max(1000).optional(),
});
export type PatientInput = z.input<typeof patientInput>;

const toRow = (i: z.output<typeof patientInput>) => ({
  name: i.name,
  birthDate: i.birthDate ?? null,
  weightKg: i.weightKg === undefined ? null : String(i.weightKg),
  species: i.species,
  notes: i.notes || null,
});

export async function createPatient(db: Db, orgId: string, input: PatientInput): Promise<Patient> {
  const [row] = await db.insert(patients).values({ organizationId: orgId, ...toRow(patientInput.parse(input)) }).returning();
  return row;
}

export function listPatients(db: Db, orgId: string): Promise<Patient[]> {
  return db.select().from(patients)
    .where(and(eq(patients.organizationId, orgId), isNull(patients.archivedAt)))
    .orderBy(asc(patients.name));
}

export async function getPatient(db: Db, orgId: string, id: string): Promise<Patient | null> {
  const [row] = await db.select().from(patients)
    .where(and(eq(patients.id, id), eq(patients.organizationId, orgId), isNull(patients.archivedAt))).limit(1);
  return row ?? null;
}

export async function updatePatient(db: Db, orgId: string, id: string, input: PatientInput): Promise<Patient | null> {
  const [row] = await db.update(patients).set(toRow(patientInput.parse(input)))
    .where(and(eq(patients.id, id), eq(patients.organizationId, orgId), isNull(patients.archivedAt))).returning();
  return row ?? null;
}

export async function archivePatient(db: Db, orgId: string, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    const archived = await tx.update(patients).set({ archivedAt: new Date() })
      .where(and(eq(patients.id, id), eq(patients.organizationId, orgId), isNull(patients.archivedAt))).returning({ id: patients.id });
    if (archived.length === 0) return;
    await tx.update(carePlans).set({ active: false })
      .where(and(eq(carePlans.patientId, id), eq(carePlans.organizationId, orgId)));
  });
  await invalidateWakeHint();
}

/**
 * Pausa o acompanhamento: sem lembretes nem doses, mas o paciente e a prescrição ficam guardados (reversível; arquivar não é).
 * Apaga as doses futuras ainda sem resultado (as já resolvidas e as passadas ficam no histórico). Idempotente.
 */
export async function pausePatient(db: Db, orgId: string, id: string, now: Date = new Date()): Promise<Patient | null> {
  const row = await db.transaction(async (tx) => {
    const [cur] = await tx.select().from(patients)
      .where(and(eq(patients.id, id), eq(patients.organizationId, orgId), isNull(patients.archivedAt))).limit(1);
    if (!cur) return null;
    if (cur.pausedAt) return cur;
    const [paused] = await tx.update(patients).set({ pausedAt: now }).where(eq(patients.id, id)).returning();
    const planIds = (await tx.select({ id: carePlans.id }).from(carePlans).where(eq(carePlans.patientId, id))).map((p) => p.id);
    if (planIds.length > 0) {
      await tx.delete(careSlots).where(and(inArray(careSlots.carePlanId, planIds), isNull(careSlots.outcome), gt(careSlots.scheduledFor, now)));
    }
    return paused;
  });
  if (row) await invalidateWakeHint();
  return row;
}

/**
 * Retoma o acompanhamento: as rotinas ativas continuam a partir da PRÓXIMA dose (a grade da âncora), então o que passou durante a
 * pausa não vira "atrasado". O limite de pacientes do plano é conferido por quem chama (a rota), como na criação.
 */
export async function resumePatient(db: Db, orgId: string, id: string, now: Date = new Date()): Promise<Patient | null> {
  const row = await db.transaction(async (tx) => {
    const [cur] = await tx.select().from(patients)
      .where(and(eq(patients.id, id), eq(patients.organizationId, orgId), isNull(patients.archivedAt))).limit(1);
    if (!cur) return null;
    if (!cur.pausedAt) return cur;
    const [resumed] = await tx.update(patients).set({ pausedAt: null }).where(eq(patients.id, id)).returning();
    const plans = await tx.select().from(carePlans).where(and(eq(carePlans.patientId, id), eq(carePlans.active, true)));
    for (const plan of plans) {
      const next = firstDueAt(plan.anchorAt, plan.intervalMinutes, now);
      await tx.update(carePlans).set({ startsAt: next, nextDueAt: next, slotsThrough: null }).where(eq(carePlans.id, plan.id));
    }
    return resumed;
  });
  if (row) await invalidateWakeHint();
  return row;
}
