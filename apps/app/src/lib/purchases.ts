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

const ELIGIBLE = 2; // INTRO_ELIGIBILITY_STATUS_ELIGIBLE do RevenueCat

/**
 * Produtos para os quais a pessoa ainda pode usar o teste grátis. **Só iOS**: o `introPrice` existe mesmo para quem já usou
 * o teste, então sem checar a tela prometeria 7 dias grátis e a loja cobraria na hora. Na dúvida (desconhecido ou falha da
 * checagem) NÃO promete. No Android quem decide a oferta é o Google (`null` = não filtra).
 */
async function trialEligible(pkgs: PurchasesPackage[]): Promise<Set<string> | null> {
  if (Platform.OS !== "ios") return null;
  const ids = pkgs.map((p) => p.product.identifier);
  try {
    const result = await Purchases.checkTrialOrIntroductoryPriceEligibility(ids);
    return new Set(ids.filter((id) => result[id]?.status === ELIGIBLE));
  } catch {
    return new Set();
  }
}

const toPkg = (pkg: PurchasesPackage, period: Pkg["period"], eligible: Set<string> | null): Pkg => ({
  id: pkg.identifier, priceString: pkg.product.priceString, period,
  trial: eligible === null || eligible.has(pkg.product.identifier) ? trialOf(pkg) : null,
});

/** Os planos da oferta atual do RevenueCat (mensal e anual). `null` = indisponível. Erros de rede sobem. */
export async function getOffer(): Promise<Offer | null> {
  if (!purchasesAvailable || !configured) return null;
  const { current } = await Purchases.getOfferings();
  const monthly = current?.monthly, annual = current?.annual;
  if (!monthly || !annual) return null;
  nativePackages.set(monthly.identifier, monthly);
  nativePackages.set(annual.identifier, annual);
  const eligible = await trialEligible([monthly, annual]);
  return { monthly: toPkg(monthly, "month", eligible), annual: toPkg(annual, "year", eligible) };
}

/**
 * Garante que o SDK está com a conta (`orgId`) ANTES de comprar ou restaurar: se o `logIn` da troca de conta falhou antes,
 * a compra iria para a conta errada (a pessoa paga e a conta certa não vira Plus). Se não consegue confirmar, falha.
 */
async function ensureAccount(orgId: string): Promise<void> {
  try {
    if ((await Purchases.getAppUserID()) !== orgId) {
      await Purchases.logIn(orgId);
      currentOrg = orgId;
    }
  } catch {
    throw new Error("Não foi possível confirmar a sua conta. Tente de novo.");
  }
}

/** Abre a compra na loja para a conta `orgId`. O usuário cancelar a folha **não** é erro (`"cancelled"`); os demais erros sobem. */
export async function purchase(pkg: Pkg, orgId: string): Promise<PurchaseResult> {
  const native = nativePackages.get(pkg.id);
  if (!native) throw new Error("Plano indisponível. Feche e abra a tela de novo.");
  await ensureAccount(orgId);
  try {
    await Purchases.purchasePackage(native);
    return "purchased";
  } catch (err) {
    if ((err as { userCancelled?: boolean } | null)?.userCancelled) return "cancelled";
    throw err;
  }
}

/** Restaura compras (exigido pela App Store) na conta `orgId`: `true` se o entitlement `plus` está ativo. */
export async function restore(orgId: string): Promise<boolean> {
  if (!purchasesAvailable || !configured) return false;
  await ensureAccount(orgId);
  const info = await Purchases.restorePurchases();
  return Boolean(info.entitlements.active?.[PLUS_ENTITLEMENT]);
}

/** Onde a pessoa gerencia/cancela a assinatura (na loja, não no app). */
export const manageUrl = (): string =>
  Platform.OS === "ios" ? "https://apps.apple.com/account/subscriptions" : "https://play.google.com/store/account/subscriptions";
