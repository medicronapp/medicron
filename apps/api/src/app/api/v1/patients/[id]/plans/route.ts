import { planCreateBody } from "@medicron/shared";
import { getDb } from "@/lib/db";
import { getApiContext } from "@/lib/api/context";
import { toPlanDto } from "@/lib/api/dto";
import { endDateError, json, readJson, route } from "@/lib/api/route";
import { NotFound } from "@/lib/errors";
import { getPatient } from "@/lib/services/patients";
import { createPlan, listPlansForPatient } from "@/lib/services/plans";

export const dynamic = "force-dynamic";

type P = { id: string };

export const GET = route<P>(async (_req, { params }) => {
  const { orgId } = await getApiContext();
  const patientId = (await params).id;
  const db = getDb();
  if (!(await getPatient(db, orgId, patientId))) throw new NotFound("Paciente");
  const plans = await listPlansForPatient(db, orgId, patientId);
  return json({ plans: plans.map(toPlanDto) });
});

export const POST = route<P>(async (req, { params }) => {
  const { orgId } = await getApiContext();
  const body = await readJson(req, planCreateBody);
  const plan = await createPlan(getDb(), orgId, {
    patientId: (await params).id,
    itemId: body.itemId,
    intervalMinutes: body.intervalMinutes,
    anchorAt: new Date(body.anchorAt),
    endAt: body.endAt ? new Date(body.endAt) : undefined,
    dose: body.dose,
    reschedule: body.reschedule,
  }).catch(endDateError);
  return json({ plan: toPlanDto(plan) }, 201);
});
