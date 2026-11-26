import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CalendarClock, UserX } from "lucide-react-native";
import type { PatientBody } from "@medicron/shared";
import { speciesLabel } from "@medicron/shared";
import { ApiClientError, errorMessage } from "@/lib/api/errors";
import { isPlanLimit } from "@/lib/plan-limit";
import { useArchivePatient, usePatient, usePausePatient, usePlans, useResumePatient, useUpdatePatient } from "@/lib/patient-queries";
import { AddButton } from "@/components/add-button";
import { ConfirmSheet } from "@/components/confirm-sheet";
import { EmptyState } from "@/components/empty-state";
import { ErrorView } from "@/components/error-view";
import { PageHeader } from "@/components/page-header";
import { PatientNotifyRow } from "@/components/patient-notify-row";
import { PatientForm } from "@/components/patient-form";
import { PlanRow } from "@/components/plan-row";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";

export default function Paciente() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; aba?: string }>();
  const id = String(params.id);
  const tab = params.aba === "dados" ? "dados" : "rotina";
  const patient = usePatient(id);
  const plans = usePlans(id);
  const update = useUpdatePatient();
  const archive = useArchivePatient();
  const pause = usePausePatient();
  const resume = useResumePatient();
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [resuming, setResuming] = useState(false);
  const back = () => router.dismissTo("/pacientes");

  if (patient.isPending) {
    return (
      <Screen>
        <View accessibilityLabel="Carregando" aria-busy className="gap-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </View>
      </Screen>
    );
  }
  if (patient.isError || !patient.data) {
    const notFound = patient.error instanceof ApiClientError && patient.error.status === 404;
    return (
      <Screen>
        {notFound ? (
          <EmptyState
            icon={UserX} title="Paciente não encontrado" description="Ele pode ter sido arquivado."
            action={<Button size="lg" onPress={back} accessibilityLabel="Ver pacientes">Ver pacientes</Button>}
          />
        ) : (
          <ErrorView onRetry={() => void patient.refetch()} />
        )}
      </Screen>
    );
  }

  const p = patient.data;
  const add = <AddButton label="Adicionar" onPress={() => router.push(`/pacientes/${p.id}/rotina/nova` as never)} />;

  async function save(body: PatientBody) {
    setSaving(true);
    try {
      await update.mutateAsync({ id, body });
      toast.success("Salvo");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const isPaused = p.pausedAt !== null;

  async function resumeCare() {
    if (resuming) return;
    setResuming(true);
    try {
      await resume.mutateAsync(id);
      toast.success("Acompanhamento retomado");
    } catch (err) {
      // Pausado não contava no limite do plano: voltar a ser ativo precisa caber nele.
      const limit = isPlanLimit(err);
      if (limit) router.push(`/plus?motivo=${limit.limit}` as never);
      else toast.error(errorMessage(err));
    } finally {
      setResuming(false);
    }
  }

  return (
    <Screen>
      <PageHeader title={p.name} description={speciesLabel(p.species)} onBack={back} actions={tab === "rotina" ? add : undefined} />
      {isPaused ? (
        <View className="gap-3 rounded-2xl border border-border bg-muted p-3.5">
          <Text className="text-sm">Acompanhamento pausado. Sem lembretes até você retomar.</Text>
          <Button size="lg" loading={resuming} onPress={() => void resumeCare()} accessibilityLabel="Retomar acompanhamento">Retomar acompanhamento</Button>
        </View>
      ) : null}
      <PatientNotifyRow patientId={p.id} notify={p.notify} />
      <Segmented
        accessibilityLabel="Seções do paciente"
        items={[{ key: "dados", label: "Dados" }, { key: "rotina", label: "Rotina" }]}
        value={tab}
        onChange={(aba) => router.setParams({ aba })}
      />
      {tab === "dados" ? (
        <View className="gap-8">
          <PatientForm patient={p} onSubmit={save} submitting={saving} />
          {isPaused ? null : (
            <View className="gap-2">
              <Button variant="outline" size="lg" onPress={() => setPausing(true)} accessibilityLabel="Pausar acompanhamento">Pausar acompanhamento</Button>
              <Text className="text-sm text-muted-foreground">Para quando o tratamento parou por um tempo. Nada é apagado e você retoma quando quiser.</Text>
            </View>
          )}
          <Button variant="destructive" size="lg" onPress={() => setArchiving(true)} accessibilityLabel="Arquivar paciente">Arquivar paciente</Button>
          <ConfirmSheet
            open={pausing} onOpenChange={setPausing} tone="default"
            title={`Pausar o acompanhamento de ${p.name}?`}
            description="Sem lembretes e sem doses na tela Hoje. As rotinas ficam guardadas e você pode retomar quando quiser. Pausado, não conta no limite de pacientes do plano."
            confirmLabel="Pausar"
            onConfirm={async () => { await pause.mutateAsync(id); toast.success("Acompanhamento pausado"); }}
          />
          <ConfirmSheet
            open={archiving} onOpenChange={setArchiving}
            title={`Arquivar ${p.name}?`}
            description="O paciente some das listas e todas as rotinas dele são encerradas."
            confirmLabel="Arquivar"
            onConfirm={async () => { await archive.mutateAsync(id); back(); }}
          />
        </View>
      ) : plans.isPending ? (
        <Skeleton className="h-20 w-full rounded-2xl" />
      ) : plans.isError || !plans.data ? (
        <ErrorView onRetry={() => void plans.refetch()} />
      ) : plans.data.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Sem rotina ainda" description="Associe uma medicação ou procedimento e defina a frequência." action={add} />
      ) : (
        <View className="gap-3">
          {plans.data.map((plan) => <PlanRow key={plan.id} plan={plan} patientName={p.name} />)}
        </View>
      )}
    </Screen>
  );
}
