import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PatientBody, PlanCreateBody, PlanPatchBody } from "@medicron/shared";
import { apiClient } from "@/lib/api";
import { archivePatient, createPatient, fetchPatient, fetchPatients, updatePatient } from "@/lib/api/patients";
import { createPlan, deactivatePlan, fetchPlans, updatePlan } from "@/lib/api/plans";
import { useAppSession } from "@/lib/session";

const useSignedIn = () => useAppSession().status === "signedIn";

export const usePatients = () =>
  useQuery({ queryKey: ["patients"], queryFn: () => fetchPatients(apiClient), enabled: useSignedIn() });

export const usePatient = (id: string) =>
  useQuery({ queryKey: ["patient", id], queryFn: () => fetchPatient(apiClient, id), enabled: useSignedIn() });

export const usePlans = (patientId: string) =>
  useQuery({ queryKey: ["plans", patientId], queryFn: () => fetchPlans(apiClient, patientId), enabled: useSignedIn() });

// Os itens têm o seu próprio módulo (`item-queries`); a Nova rotina continua importando `useItems` daqui.
export { useItems } from "@/lib/item-queries";

/** Invalida o que mostra pacientes ou rotinas: listas, detalhes, rotinas e a Hoje (que lista os cuidados). */
function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: string[]) => Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: [k] })));
}

export function useCreatePatient() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (body: PatientBody) => createPatient(apiClient, body), onSuccess: () => invalidate("patients", "home") });
}
export function useUpdatePatient() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PatientBody }) => updatePatient(apiClient, id, body),
    onSuccess: () => invalidate("patients", "patient", "home"),
  });
}
export function useArchivePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archivePatient(apiClient, id),
    onSuccess: (_res, id) => {
      // O detalhe e as rotinas do paciente arquivado ficam como velhos, sem rebuscar: com a tela ainda montada, remover
      // recriaria uma consulta vazia (esqueleto) e rebuscar daria 404. Reaberta, a tela busca e cai no "não encontrado".
      qc.invalidateQueries({ queryKey: ["patient", id], refetchType: "none" });
      qc.invalidateQueries({ queryKey: ["plans", id], refetchType: "none" });
      return Promise.all([qc.invalidateQueries({ queryKey: ["patients"] }), qc.invalidateQueries({ queryKey: ["home"] })]);
    },
  });
}
export function useCreatePlan() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ patientId, body }: { patientId: string; body: PlanCreateBody }) => createPlan(apiClient, patientId, body),
    onSuccess: () => invalidate("plans", "home"),
  });
}
export function useUpdatePlan() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ planId, body }: { planId: string; body: PlanPatchBody }) => updatePlan(apiClient, planId, body),
    onSuccess: () => invalidate("plans", "home"),
  });
}
export function useDeactivatePlan() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (planId: string) => deactivatePlan(apiClient, planId), onSuccess: () => invalidate("plans", "patients", "patient", "home") });
}
