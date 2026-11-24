import type { Offer, Pkg, PurchaseResult, WelcomeOffer } from "./purchases-types";

export type { Offer, Pkg, PurchaseResult, WelcomeOffer };

/**
 * Só para gerar as imagens de revisão e de divulgação da tela de planos (`npm run capture-paywall`): um build web especial, com
 * `EXPO_PUBLIC_PREVIEW_PAYWALL=1`, mostra os planos com preços de exemplo. No app e na web de verdade vale `false`.
 */
export const previewPaywall = process.env.EXPO_PUBLIC_PREVIEW_PAYWALL === "1";
const PREVIEW_OFFER: Offer = {
  monthly: { id: "$rc_monthly", priceString: "R$ 12,90", period: "month", trial: null, price: 12.9, pricePerMonthString: null },
  annual: { id: "$rc_annual", priceString: "R$ 89,90", period: "year", trial: { days: 7 }, price: 89.9, pricePerMonthString: "R$ 7,49" },
};
const PREVIEW_WELCOME: WelcomeOffer = {
  pkg: { id: "welcome:$rc_annual", priceString: "R$ 59,90", period: "year", trial: null, price: 59.9, pricePerMonthString: null },
  priceString: "R$ 59,90", regularPriceString: "R$ 89,90", savingsPercent: 33,
};

// Na web não há compra (a Apple proíbe levar o iOS a pagamento externo; a web só mostra o estado do plano).
export const purchasesAvailable = previewPaywall;
export async function configurePurchases(_orgId: string | null): Promise<void> {}
export async function getOffer(): Promise<Offer | null> { return previewPaywall ? PREVIEW_OFFER : null; }
export async function getWelcomeOffer(): Promise<WelcomeOffer | null> { return previewPaywall ? PREVIEW_WELCOME : null; }
export async function purchase(_pkg: Pkg, _orgId: string): Promise<PurchaseResult> { throw new Error("A assinatura é feita pelo aplicativo no celular."); }
export async function restore(_orgId: string): Promise<boolean> { return false; }
export const manageUrl = (): string => "";
