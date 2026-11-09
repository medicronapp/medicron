import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ItemBody } from "@medicron/shared";
import { apiClient } from "@/lib/api";
import { archiveItem, createItem, fetchItem, fetchItems, updateItem, type ItemKind } from "@/lib/api/items";
import { useAppSession } from "@/lib/session";

const useSignedIn = () => useAppSession().status === "signedIn";

/** Itens da conta; com `kind`, só daquele tipo (cada tipo tem a sua chave, e o prefixo `["items"]` pega todas). */
export const useItems = (kind?: ItemKind) =>
  useQuery({ queryKey: ["items", kind ?? "all"], queryFn: () => fetchItems(apiClient, kind), enabled: useSignedIn() });

export const useItem = (id: string) =>
  useQuery({ queryKey: ["item", id], queryFn: () => fetchItem(apiClient, id), enabled: useSignedIn() });

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (body: ItemBody) => createItem(apiClient, body), onSuccess: () => qc.invalidateQueries({ queryKey: ["items"] }) });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ItemBody }) => updateItem(apiClient, id, body),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: ["items"] }), qc.invalidateQueries({ queryKey: ["item"] })]),
  });
}

/** Arquivar encerra as rotinas que usam o item: o que mostra rotinas, pacientes e a Hoje também é atualizado. */
export function useArchiveItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveItem(apiClient, id),
    onSuccess: (_res, id) => {
      // Marca o detalhe como velho, sem rebuscar: com a tela ainda montada, remover recriaria uma consulta vazia (esqueleto)
      // e rebuscar daria 404. Se a tela for aberta de novo, aí sim busca e cai no "não encontrado".
      qc.invalidateQueries({ queryKey: ["item", id], refetchType: "none" });
      return Promise.all(["items", "plans", "patients", "patient", "home"].map((k) => qc.invalidateQueries({ queryKey: [k] })));
    },
  });
}
