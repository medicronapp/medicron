import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { patientNotificationMutes, patients } from "@/lib/db/schema";

/**
 * Liga/desliga os avisos de dose de UM paciente para UMA pessoa. Sem linha = recebe (o padrão). Devolve `false` se o paciente
 * não existe nesta conta (ou foi arquivado). Idempotente. Só decide quem recebe o push; a tela Hoje não muda.
 */
export async function setPatientNotifications(db: Db, orgId: string, userId: string, patientId: string, enabled: boolean): Promise<boolean> {
  const [patient] = await db.select({ id: patients.id }).from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId), isNull(patients.archivedAt))).limit(1);
  if (!patient) return false;
  if (enabled) {
    await db.delete(patientNotificationMutes)
      .where(and(eq(patientNotificationMutes.userId, userId), eq(patientNotificationMutes.patientId, patientId)));
  } else {
    await db.insert(patientNotificationMutes).values({ userId, patientId }).onConflictDoNothing();
  }
  return true;
}

/** Pacientes que esta pessoa silenciou. */
export async function mutedPatientIds(db: Db, userId: string): Promise<Set<string>> {
  const rows = await db.select({ id: patientNotificationMutes.patientId }).from(patientNotificationMutes)
    .where(eq(patientNotificationMutes.userId, userId));
  return new Set(rows.map((r) => r.id));
}

/** Para o disparo: por paciente, as pessoas que silenciaram o aviso dele. */
export async function mutedUsersByPatient(db: Db, patientIds: string[]): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  if (patientIds.length === 0) return map;
  const rows = await db.select().from(patientNotificationMutes).where(inArray(patientNotificationMutes.patientId, patientIds));
  for (const r of rows) map.set(r.patientId, (map.get(r.patientId) ?? new Set()).add(r.userId));
  return map;
}
