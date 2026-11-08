import { QueryClient } from "@tanstack/react-query";
import { ApiClientError } from "./errors";

/** Dados frescos por 30 s; erros 4xx (inclui o 426 de "atualize o app") não se repetem; rede e 5xx tentam até 2 vezes. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failures, error) => {
        if (error instanceof ApiClientError && error.status >= 400 && error.status < 500) return false;
        return failures < 2;
      },
    },
  },
});

/**
 * Troca de conta: tudo que é da conta anterior sai do cache (só "me", o usuário, fica), em vez de só ficar "velho":
 * senão uma tela ainda não visitada mostraria por um instante os dados da conta anterior.
 */
export function resetAccountData() {
  queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
  return queryClient.invalidateQueries();
}
