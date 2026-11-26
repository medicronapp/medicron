import { getDb } from "@/lib/db";
import { getApiContext } from "@/lib/api/context";
import { toPatientDto } from "@/lib/api/dto";
import { mutedPatientIds } from "@/lib/services/notification-prefs";
import { json, route } from "@/lib/api/route";
import { NotFound } from "@/lib/errors";
import { pausePatient } from "@/lib/services/patients";

export const dynamic = "force-dynamic";

/** Pausa o acompanhamento do paciente (sem lembretes; a prescrição fica). Idempotente. */
export const POST = route<{ id: string }>(async (_req, { params }) => {
  const { orgId, userId } = await getApiContext();
  const patient = await pausePatient(getDb(), orgId, (await params).id);
  if (!patient) throw new NotFound("Paciente");
  return json({ patient: toPatientDto(patient, !(await mutedPatientIds(getDb(), userId)).has(patient.id)) });
});
