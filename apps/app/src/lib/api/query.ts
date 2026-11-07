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
