import { planPatchBody } from "@medicron/shared";
import { getDb } from "@/lib/db";
import { getApiContext } from "@/lib/api/context";
import { toPlanDto } from "@/lib/api/dto";
import { endDateError, json, noContent, readJson, route } from "@/lib/api/route";
import { deactivatePlan, updatePlan } from "@/lib/services/plans";

export const dynamic = "force-dynamic";

type P = { id: string };

export const PATCH = route<P>(async (req, { params }) => {
  const { orgId } = await getApiContext();
  const body = await readJson(req, planPatchBody);
  const plan = await updatePlan(getDb(), orgId, (await params).id, {
    dose: body.dose,
    reschedule: body.reschedule,
    endAt: body.endAt === undefined ? undefined : body.endAt === null ? null : new Date(body.endAt),
  }).catch(endDateError);
  return json({ plan: toPlanDto(plan) });
});

export const DELETE = route<P>(async (_req, { params }) => {
  const { orgId } = await getApiContext();
  await deactivatePlan(getDb(), orgId, (await params).id);
  return noContent();
});
