import type { Offer, Pkg, PurchaseResult } from "./purchases-types";

export type { Offer, Pkg, PurchaseResult };

// Na web não há compra (a Apple proíbe levar o iOS a pagamento externo; a web só mostra o estado do plano).
export const purchasesAvailable = false;
export async function configurePurchases(_orgId: string | null): Promise<void> {}
export async function getOffer(): Promise<Offer | null> { return null; }
export async function purchase(_pkg: Pkg): Promise<PurchaseResult> { throw new Error("A assinatura é feita pelo aplicativo no celular."); }
export async function restore(): Promise<boolean> { return false; }
export const manageUrl = (): string => "";
