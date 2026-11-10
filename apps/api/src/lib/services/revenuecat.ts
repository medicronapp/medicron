import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { organization, orgSubscriptions } from "@/lib/db/schema";
import { getSubscription, grantPlus } from "@/lib/services/subscription";
import type { SubscriptionDto } from "@medicron/shared";

/** Evento do webhook do RevenueCat (só os campos que usamos; nomes da documentação). */
export type RevenueCatEvent = {
  id: string;
  type: string;
  /** No Medicron é o id da organização (conta). Anônimos vêm como `$RCAnonymousID:...`. */
  app_user_id: string;
  product_id?: string | null;
  store?: string | null;
  environment?: string | null;
  period_type?: string | null;
  expiration_at_ms?: number | null;
  event_timestamp_ms: number;
};

type Source = "apple" | "google" | "manual";

/** Eventos que concedem ou estendem o Plus até `expiration_at_ms`. */
const GRANTING = new Set(["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION", "REFUND_REVERSED", "SUBSCRIPTION_EXTENDED", "NON_RENEWING_PURCHASE"]);

const sourceOf = (store?: string | null): Source =>
  store === "PLAY_STORE" ? "google" : store === "APP_STORE" || store === "MAC_APP_STORE" ? "apple" : "manual";

/**
 * Aplica um evento do RevenueCat à assinatura da conta. Idempotente e à prova de ordem: evento com instante igual ou anterior
 * ao último já aplicado é ignorado (o RevenueCat reenvia com o mesmo `id` e instante). Eventos de usuário que não é uma
 * organização existente, de tipos que não interessam (TEST, BILLING_ISSUE, TRANSFER...) ou sem validade são ignorados.
 */
export async function applyRevenueCatEvent(db: Db, event: RevenueCatEvent, now: Date): Promise<"applied" | "ignored"> {
  const [org] = await db.select({ id: organization.id }).from(organization).where(eq(organization.id, event.app_user_id)).limit(1);
  if (!org) return "ignored";
  const [row] = await db.select().from(orgSubscriptions).where(eq(orgSubscriptions.organizationId, org.id)).limit(1);
  if (row && event.event_timestamp_ms <= row.lastEventMs) return "ignored";

  if (GRANTING.has(event.type)) {
    if (event.expiration_at_ms == null) return "ignored";
    await grantPlus(db, org.id, new Date(event.expiration_at_ms), sourceOf(event.store), {
      productId: event.product_id ?? undefined, willRenew: event.type !== "NON_RENEWING_PURCHASE", eventMs: event.event_timestamp_ms,
    });
    return "applied";
  }

  if (event.type === "CANCELLATION" || event.type === "EXPIRATION") {
    if (!row) return "ignored"; // nada a cancelar
    const until = event.type === "EXPIRATION"
      ? new Date(Math.min(event.expiration_at_ms ?? now.getTime(), now.getTime()))
      : event.expiration_at_ms != null ? new Date(event.expiration_at_ms) : row.plusUntil;
    await db.update(orgSubscriptions)
      .set({ plusUntil: until, willRenew: false, lastEventMs: event.event_timestamp_ms, updatedAt: new Date() })
      .where(eq(orgSubscriptions.organizationId, org.id));
    return "applied";
  }

  return "ignored";
}

/** O RevenueCat não está configurado neste ambiente (falta a chave secreta). */
export class BillingUnavailable extends Error {
  constructor() { super("Cobrança indisponível: RevenueCat não configurado."); }
}

export type SubscriberEntitlement = { plusExpiresAt: Date | null; productId?: string; store?: string; willRenew?: boolean };

/** Consulta a API REST do RevenueCat: o entitlement `plus` do assinante (id da organização). `null` = sem entitlement ativo. */
export async function fetchSubscriber(orgId: string): Promise<SubscriberEntitlement | null> {
  const key = process.env.REVENUECAT_SECRET_API_KEY;
  if (!key) throw new BillingUnavailable();
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(orgId)}`, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`RevenueCat respondeu ${res.status}`);
  const data = (await res.json()) as {
    subscriber?: {
      entitlements?: Record<string, { expires_date?: string | null; product_identifier?: string }>;
      subscriptions?: Record<string, { store?: string; unsubscribe_detected_at?: string | null }>;
    };
  };
  const ent = data.subscriber?.entitlements?.plus;
  if (!ent?.expires_date) return null;
  const subscription = ent.product_identifier ? data.subscriber?.subscriptions?.[ent.product_identifier] : undefined;
  return { plusExpiresAt: new Date(ent.expires_date), productId: ent.product_identifier, store: subscription?.store, willRenew: !subscription?.unsubscribe_detected_at };
}

/**
 * Sincroniza sob demanda (logo depois da compra, antes de o webhook chegar). Só **concede**: nunca derruba nem encurta um
 * Plus que já vale mais (manual ou de outra loja); quem derruba são os eventos de expiração e a própria validade.
 */
export async function syncFromRevenueCat(
  db: Db, orgId: string, now: Date, fetcher: (orgId: string) => Promise<SubscriberEntitlement | null> = fetchSubscriber,
): Promise<SubscriptionDto> {
  const found = await fetcher(orgId);
  if (found?.plusExpiresAt && found.plusExpiresAt.getTime() > now.getTime()) {
    const [row] = await db.select().from(orgSubscriptions).where(eq(orgSubscriptions.organizationId, orgId)).limit(1);
    if (row?.plusUntil && row.plusUntil.getTime() >= found.plusExpiresAt.getTime()) return getSubscription(db, orgId, now); // já vale igual ou mais
    await grantPlus(db, orgId, found.plusExpiresAt, found.store === "play_store" ? "google" : found.store === "app_store" || found.store === "mac_app_store" ? "apple" : "manual", {
      productId: found.productId, willRenew: found.willRenew ?? true, eventMs: Math.max(now.getTime(), row?.lastEventMs ?? 0),
    });
  }
  return getSubscription(db, orgId, now);
}
