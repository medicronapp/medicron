import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/lib/db";
import { patients, carePlans, type Patient } from "@/lib/db/schema";

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
}
