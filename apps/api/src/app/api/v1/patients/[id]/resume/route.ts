import { getDb } from "@/lib/db";
import { getApiContext } from "@/lib/api/context";
import { toPatientDto } from "@/lib/api/dto";
import { mutedPatientIds } from "@/lib/services/notification-prefs";
import { json, route } from "@/lib/api/route";
import { NotFound } from "@/lib/errors";
import { getPatient, resumePatient } from "@/lib/services/patients";
import { assertCanCreatePatient } from "@/lib/services/subscription";

export const dynamic = "force-dynamic";

/** Retoma o acompanhamento. Pausado não contava no limite do plano, então voltar a ser ativo tem que caber nele (402 plan_limit). */
export const POST = route<{ id: string }>(async (_req, { params }) => {
  const { orgId, userId } = await getApiContext();
  const db = getDb();
  const id = (await params).id;
  const current = await getPatient(db, orgId, id);
  if (!current) throw new NotFound("Paciente");
  if (current.pausedAt) await assertCanCreatePatient(db, orgId, new Date());
  const patient = await resumePatient(db, orgId, id);
  if (!patient) throw new NotFound("Paciente");
  return json({ patient: toPatientDto(patient, !(await mutedPatientIds(getDb(), userId)).has(patient.id)) });
});
