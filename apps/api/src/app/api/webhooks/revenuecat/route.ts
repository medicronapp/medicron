import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { ApiError } from "@/lib/api/errors";
import { json, readJson, route } from "@/lib/api/route";
import { applyRevenueCatEvent } from "@/lib/services/revenuecat";

export const dynamic = "force-dynamic";

const body = z.object({
  event: z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    app_user_id: z.string().min(1),
    product_id: z.string().nullish(),
    store: z.string().nullish(),
    environment: z.string().nullish(),
    period_type: z.string().nullish(),
    expiration_at_ms: z.number().nullish(),
    event_timestamp_ms: z.number(),
  }).passthrough(),
}).passthrough();

const same = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Webhook do RevenueCat: atualiza o plano da conta (`app_user_id` = id da organização). Autenticado só pelo segredo
 * (cabeçalho Authorization, valor puro ou "Bearer ..."). Sempre 200 para evento ignorado, para o RevenueCat não reenviar.
 */
export const POST = route(async (req) => {
  const sent = req.headers.get("authorization");
  if (!sent) throw new ApiError(401, "unauthorized", "Não autorizado.");
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) throw new ApiError(503, "webhook_not_configured", "Webhook não configurado.");
  if (!same(sent, secret) && !same(sent, `Bearer ${secret}`)) throw new ApiError(401, "unauthorized", "Não autorizado.");
  const { event } = await readJson(req, body);
  const result = await applyRevenueCatEvent(getDb(), event, new Date());
  return json({ result });
}, { gate: false });
