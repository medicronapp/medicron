import { patientBody } from "@medicron/shared";
import { getDb } from "@/lib/db";
import { getApiContext } from "@/lib/api/context";
import { toPatientDto } from "@/lib/api/dto";
import { json, readJson, route } from "@/lib/api/route";
import { createPatient, listPatients } from "@/lib/services/patients";
import { assertCanCreatePatient } from "@/lib/services/subscription";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const { orgId } = await getApiContext();
  const patients = await listPatients(getDb(), orgId);
  return json({ patients: patients.map(toPatientDto) });
});

export const POST = route(async (req) => {
  const { orgId } = await getApiContext();
  const body = await readJson(req, patientBody);
  await assertCanCreatePatient(getDb(), orgId, new Date());
  const patient = await createPatient(getDb(), orgId, body);
  return json({ patient: toPatientDto(patient) }, 201);
});
