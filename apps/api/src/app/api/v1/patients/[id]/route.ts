import { patientBody } from "@medicron/shared";
import { getDb } from "@/lib/db";
import { getApiContext } from "@/lib/api/context";
import { toPatientDto } from "@/lib/api/dto";
import { json, noContent, readJson, route } from "@/lib/api/route";
import { NotFound } from "@/lib/errors";
import { archivePatient, getPatient, updatePatient } from "@/lib/services/patients";

export const dynamic = "force-dynamic";

type P = { id: string };

export const GET = route<P>(async (_req, { params }) => {
  const { orgId } = await getApiContext();
  const patient = await getPatient(getDb(), orgId, (await params).id);
  if (!patient) throw new NotFound("Paciente");
  return json({ patient: toPatientDto(patient) });
});

export const PATCH = route<P>(async (req, { params }) => {
  const { orgId } = await getApiContext();
  const body = await readJson(req, patientBody);
  const patient = await updatePatient(getDb(), orgId, (await params).id, body);
  if (!patient) throw new NotFound("Paciente");
  return json({ patient: toPatientDto(patient) });
});

export const DELETE = route<P>(async (_req, { params }) => {
  const { orgId } = await getApiContext();
  await archivePatient(getDb(), orgId, (await params).id);
  return noContent();
});
