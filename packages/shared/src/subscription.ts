import { addDays } from "./time";

/** Plano da conta: grátis ou Medicron Plus (assinatura por conta, vale para todas as pessoas dela). */
export type Tier = "free" | "plus";

/** Limites de uma conta. `null` = ilimitado. Só podem **afrouxar** depois do lançamento, nunca apertar. */
export type Limits = { patients: number | null; members: number; historyDays: number | null };

export const FREE_LIMITS: Limits = { patients: 2, members: 2, historyDays: 30 };
export const PLUS_LIMITS: Limits = { patients: null, members: 8, historyDays: null };

export const limitsFor = (tier: Tier): Limits => (tier === "plus" ? PLUS_LIMITS : FREE_LIMITS);

/** O dia mais antigo (AAAA-MM-DD) que a conta pode ver no histórico; `null` = sem corte. */
export function historyCutoffKey(todayKey: string, tier: Tier): string | null {
  const days = limitsFor(tier).historyDays;
  return days === null ? null : addDays(todayKey, -days);
}

/** Identificadores fixos: entitlement do RevenueCat e produtos nas lojas. */
export const PLUS_ENTITLEMENT = "plus";
export const PRODUCT_IDS = { monthly: "app.medicron.plus.monthly", annual: "app.medicron.plus.annual" } as const;

/** O que a API devolve sobre a assinatura da conta (em `/me`). */
export type SubscriptionDto = {
  tier: Tier;
  plusUntil: string | null;
  source: "apple" | "google" | "manual" | null;
  willRenew: boolean;
  limits: Limits;
  usage: { patients: number; members: number };
};
