import { Platform } from "react-native";
import Purchases, { type PurchasesPackage } from "react-native-purchases";
import { PLUS_ENTITLEMENT } from "@medicron/shared";
import type { Offer, Pkg, PurchaseResult } from "./purchases-types";

export type { Offer, Pkg, PurchaseResult };

// Chaves PÚBLICAS do SDK do RevenueCat (uma por plataforma), definidas no EAS. Sem elas o app funciona, só sem compra.
const apiKey = (): string | null =>
  (Platform.OS === "ios" ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY) || null;

export const purchasesAvailable: boolean = apiKey() !== null;

let configured = false;
let currentOrg: string | null = null;
const nativePackages = new Map<string, PurchasesPackage>();

/**
 * Liga o RevenueCat à conta ativa: o `app_user_id` é o **id da organização**, então a assinatura é da conta (da família).
 * Idempotente: a mesma conta não refaz nada; trocar de conta faz `logIn`; sair (`null`) faz `logOut`. Nunca lança: erro do SDK
 * deixa o app seguindo sem compra.
 */
export async function configurePurchases(orgId: string | null): Promise<void> {
  const key = apiKey();
  if (!key) return;
  try {
    if (!configured) {
      if (!orgId) return;
      Purchases.configure({ apiKey: key, appUserID: orgId });
      configured = true;
      currentOrg = orgId;
      return;
    }
    if (orgId === currentOrg) return;
    if (orgId) await Purchases.logIn(orgId);
    else await Purchases.logOut();
    currentOrg = orgId;
  } catch {
    // o SDK falhou: o app continua e a tela do Plus mostra "indisponível"
  }
}

const UNIT_DAYS: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };

/** Teste **grátis** (preço 0) da oferta introdutória, em dias. Oferta introdutória paga não é teste grátis. */
function trialOf(pkg: PurchasesPackage): Pkg["trial"] {
  const intro = pkg.product.introPrice;
  if (!intro || intro.price !== 0) return null;
  const perUnit = UNIT_DAYS[intro.periodUnit];
  return perUnit ? { days: intro.periodNumberOfUnits * perUnit } : null;
}

const toPkg = (pkg: PurchasesPackage, period: Pkg["period"]): Pkg => ({ id: pkg.identifier, priceString: pkg.product.priceString, period, trial: trialOf(pkg) });

/** Os planos da oferta atual do RevenueCat (mensal e anual). `null` = indisponível. Erros de rede sobem. */
export async function getOffer(): Promise<Offer | null> {
  if (!purchasesAvailable || !configured) return null;
  const { current } = await Purchases.getOfferings();
  const monthly = current?.monthly, annual = current?.annual;
  if (!monthly || !annual) return null;
  nativePackages.set(monthly.identifier, monthly);
  nativePackages.set(annual.identifier, annual);
  return { monthly: toPkg(monthly, "month"), annual: toPkg(annual, "year") };
}

/** Abre a compra na loja. O usuário cancelar a folha **não** é erro (`"cancelled"`); os demais erros sobem. */
export async function purchase(pkg: Pkg): Promise<PurchaseResult> {
  const native = nativePackages.get(pkg.id);
  if (!native) throw new Error("Plano indisponível. Feche e abra a tela de novo.");
  try {
    await Purchases.purchasePackage(native);
    return "purchased";
  } catch (err) {
    if ((err as { userCancelled?: boolean } | null)?.userCancelled) return "cancelled";
    throw err;
  }
}

/** Restaura compras (exigido pela App Store): `true` se o entitlement `plus` está ativo. */
export async function restore(): Promise<boolean> {
  if (!purchasesAvailable || !configured) return false;
  const info = await Purchases.restorePurchases();
  return Boolean(info.entitlements.active?.[PLUS_ENTITLEMENT]);
}

/** Onde a pessoa gerencia/cancela a assinatura (na loja, não no app). */
export const manageUrl = (): string =>
  Platform.OS === "ios" ? "https://apps.apple.com/account/subscriptions" : "https://play.google.com/store/account/subscriptions";
