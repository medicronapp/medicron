import { getDb } from "@/lib/db";
import { webPushSender } from "@/lib/push/sender";
import { dispatchDue } from "@/lib/services/dispatch";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }
  const result = await dispatchDue(getDb(), new Date(), webPushSender);
  return Response.json(result);
}
