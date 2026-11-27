import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { UserX } from "lucide-react-native";
import type { PlanCreateBody } from "@medicron/shared";
import { ApiClientError, errorMessage } from "@/lib/api/errors";
import { useCreateItem } from "@/lib/item-queries";
import { useCreatePlan, useItems, usePatient } from "@/lib/patient-queries";
import { EmptyState } from "@/components/empty-state";
import { ErrorView } from "@/components/error-view";
import { PageHeader } from "@/components/page-header";
import { PlanForm } from "@/components/plan-form";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

export default function NovaRotina() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = String(params.id);
  const patient = usePatient(id);
  const items = useItems();
  const create = useCreatePlan();
  const createItem = useCreateItem();
  const toPatient = () => router.dismissTo(`/pacientes/${id}` as never);

  if (patient.isPending || items.isPending) {
    return (
      <Screen>
        <View accessibilityLabel="Carregando" aria-busy className="gap-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
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
            action={<Button size="lg" onPress={() => router.dismissTo("/pacientes")} accessibilityLabel="Ver pacientes">Ver pacientes</Button>}
          />
        ) : (
          <ErrorView onRetry={() => void patient.refetch()} />
        )}
      </Screen>
    );
  }
  if (items.isError || !items.data) {
    return (
      <Screen>
        <ErrorView onRetry={() => void items.refetch()} />
      </Screen>
    );
  }

  async function submit(body: PlanCreateBody) {
    try {
      await create.mutateAsync({ patientId: id, body });
      toast.success("Salvo");
      toPatient();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Screen>
      <PageHeader title="Nova rotina" description={patient.data.name} onBack={toPatient} />
      <PlanForm items={items.data} onSubmit={submit} onCreateItem={(body) => createItem.mutateAsync(body)} />
    </Screen>
  );
}
