/** Um plano à venda (mensal ou anual): preço e teste grátis vêm da **loja**, nunca do código. */
export type Pkg = { id: string; priceString: string; period: "month" | "year"; trial: { days: number } | null };
export type Offer = { monthly: Pkg; annual: Pkg };
export type PurchaseResult = "purchased" | "cancelled";
