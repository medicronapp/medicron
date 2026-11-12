import type { SubscriptionDto } from "@medicron/shared";
import type { ApiClient } from "./client";

/** Pede à API que confira a assinatura da conta no RevenueCat (logo depois da compra, antes de o webhook chegar). */
export const syncSubscription = async (c: ApiClient): Promise<SubscriptionDto> =>
  (await c.request<{ subscription: SubscriptionDto }>("POST", "/subscription/sync")).subscription;
