// A oferta de boas-vindas abre no máximo uma vez por sessão do app: se não puder aparecer (sem rede, produto ainda não
// configurado), a Hoje não tenta de novo a cada atualização. A "única vez" de verdade é gravada no servidor ao exibir.
let attempted = false;

/** `true` só na primeira chamada da sessão. */
export function claimWelcomeOfferAttempt(): boolean {
  if (attempted) return false;
  attempted = true;
  return true;
}

/** Só para os testes. */
export function resetWelcomeOfferAttempt(): void {
  attempted = false;
}
