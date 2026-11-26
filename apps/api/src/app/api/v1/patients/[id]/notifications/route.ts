import { patientNotificationsBody } from "@medicron/shared";
import { getDb } from "@/lib/db";
import { getApiContext } from "@/lib/api/context";
import { toPatientDto } from "@/lib/api/dto";
import { json, readJson, route } from "@/lib/api/route";
import { NotFound } from "@/lib/errors";
import { setPatientNotifications } from "@/lib/services/notification-prefs";
import { getPatient } from "@/lib/services/patients";

export const dynamic = "force-dynamic";

/** Liga ou desliga os avisos de dose deste paciente **para a pessoa logada** (cada um decide o seu). */
export const POST = route<{ id: string }>(async (req, { params }) => {
  const { orgId, userId } = await getApiContext();
  const { enabled } = await readJson(req, patientNotificationsBody);
  const db = getDb();
  const id = (await params).id;
  if (!(await setPatientNotifications(db, orgId, userId, id, enabled))) throw new NotFound("Paciente");
  const patient = await getPatient(db, orgId, id);
  if (!patient) throw new NotFound("Paciente");
  return json({ patient: toPatientDto(patient, enabled) });
});
