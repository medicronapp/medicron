import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DoseBody } from "@medicron/shared";
import { apiClient } from "@/lib/api";
import { completeWelcome, dismissChecklist, fetchHome, recordDose, type HomeResponse } from "@/lib/api/home";
import { useAppSession } from "@/lib/session";

export const HOME_KEY = ["home"] as const;

/** A tela Hoje (um dia). Só consulta com sessão. */
export function useHome(dia?: string) {
  const { status } = useAppSession();
  return useQuery({ queryKey: [...HOME_KEY, dia ?? "today"], queryFn: () => fetchHome(apiClient, dia), enabled: status === "signedIn" });
}

/** Só LÊ o cache da Hoje de hoje (nunca busca nada) e avisa quando a tela Hoje o atualiza: base do widget do iOS. */
export function useCachedHome() {
  return useQuery<HomeResponse>({ queryKey: [...HOME_KEY, "today"], queryFn: skipToken }).data;
}

/** Registrar dose: recarrega a Hoje quando algo mudou (registrada, ou "já registrada" por outra pessoa). */
export function useRecordDose() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DoseBody) => recordDose(apiClient, body),
    onSuccess: (res) => {
      if (res.recorded || res.reason === "already") return qc.invalidateQueries({ queryKey: HOME_KEY });
    },
  });
}

export function useCompleteWelcome() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => completeWelcome(apiClient), onSuccess: () => qc.invalidateQueries({ queryKey: HOME_KEY }) });
}

export function useDismissChecklist() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => dismissChecklist(apiClient), onSuccess: () => qc.invalidateQueries({ queryKey: HOME_KEY }) });
}
