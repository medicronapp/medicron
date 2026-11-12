import { getDb } from "@/lib/db";
import { ApiError } from "@/lib/api/errors";
import { getApiContext } from "@/lib/api/context";
import { json, route } from "@/lib/api/route";
import { BillingUnavailable, fetchSubscriber, syncFromRevenueCat } from "@/lib/services/revenuecat";

export const dynamic = "force-dynamic";

/** Sincroniza a assinatura da conta com o RevenueCat (logo depois da compra, antes de o webhook chegar). Só dono ou administrador. */
export const POST = route(async () => {
  const { orgId, role } = await getApiContext();
  if (role !== "owner" && role !== "admin") throw new ApiError(403, "forbidden", "Só quem administra a conta pode assinar.");
  try {
    const subscription = await syncFromRevenueCat(getDb(), orgId, new Date(), fetchSubscriber);
    return json({ subscription });
  } catch (err) {
    if (err instanceof BillingUnavailable) throw new ApiError(503, "billing_unavailable", "Cobrança indisponível no momento.");
    if (err instanceof ApiError) throw err;
    console.error("revenuecat sync", err);
    throw new ApiError(502, "billing_error", "Não foi possível falar com o serviço de assinaturas.");
  }
});
