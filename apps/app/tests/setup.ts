import "@testing-library/react-native/matchers";

// Temporizadores de coleta do cache (gcTime) seguram o Jest aberto se o cache não for esvaziado ao fim de cada arquivo.
import { queryClient } from "@/lib/api/query";
// Mutações guardam o resultado por 5 min (gcTime) com um temporizador; nos testes isso segura o processo aberto.
queryClient.setDefaultOptions({ ...queryClient.getDefaultOptions(), mutations: { gcTime: 0 } });
afterAll(() => {
  queryClient.clear();
  queryClient.getMutationCache().clear();
});
