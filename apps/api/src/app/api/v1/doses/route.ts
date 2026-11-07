import { doseBody } from "@medicron/shared";
import { getDb } from "@/lib/db";
import { getApiContext } from "@/lib/api/context";
import { json, readJson, route } from "@/lib/api/route";
import { resolveSlot } from "@/lib/services/slots";

export const dynamic = "force-dynamic";

/** Registra uma dose. Registrar duas vezes o mesmo horário não é erro: o primeiro vence (`recorded:false`). */
export const POST = route(async (req) => {
  const { orgId, userId } = await getApiContext();
  const body = await readJson(req, doseBody);
  const res = await resolveSlot(getDb(), orgId, userId, {
    planId: body.planId,
    scheduledFor: new Date(body.scheduledFor),
    outcome: body.outcome,
    value: body.value,
    note: body.note,
    appliedAt: body.appliedAt ? new Date(body.appliedAt) : undefined,
  });
  return json(res.recorded ? { recorded: true } : { recorded: false, reason: "already" });
});
