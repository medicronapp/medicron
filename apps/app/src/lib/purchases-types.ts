/** Um plano à venda (mensal ou anual): preço e teste grátis vêm da **loja**, nunca do código. */
export type Pkg = {
  id: string; priceString: string; period: "month" | "year"; trial: { days: number } | null;
  /** Valor numérico na moeda da loja e o preço por mês que ela calcula (para mostrar economia). `null` = a loja não informou. */
  price?: number | null; pricePerMonthString?: string | null;
};
export type Offer = { monthly: Pkg; annual: Pkg };
/** Oferta de boas-vindas: o anual com preço de lançamento no 1º ano (`priceString`) e depois o preço normal (`regularPriceString`). */
export type WelcomeOffer = { pkg: Pkg; priceString: string; regularPriceString: string; savingsPercent: number | null };
export type PurchaseResult = "purchased" | "cancelled";
