import { View } from "react-native";
import { useRouter } from "expo-router";
import { HeartPulse } from "lucide-react-native";
import { AddButton } from "@/components/add-button";
import { EmptyState } from "@/components/empty-state";
import { ErrorView } from "@/components/error-view";
import { PageHeader } from "@/components/page-header";
import { PatientCard } from "@/components/patient-card";
import { Screen } from "@/components/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatients } from "@/lib/patient-queries";

export default function Pacientes() {
  const router = useRouter();
  const query = usePatients();

  if (query.isPending) {
    return (
      <Screen>
        <View accessibilityLabel="Carregando" aria-busy className="gap-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </View>
      </Screen>
    );
  }
  if (!query.data) {
    return (
      <Screen>
        <ErrorView onRetry={() => void query.refetch()} />
      </Screen>
    );
  }

  const patients = query.data;
  const add = <AddButton label="Novo paciente" onPress={() => router.push("/pacientes/novo")} />;
  return (
    <Screen testID="patients-scroll" refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <PageHeader
        title="Pacientes"
        description={patients.length ? `${patients.length} ${patients.length === 1 ? "paciente" : "pacientes"} nesta conta` : undefined}
        actions={add}
      />
      {patients.length === 0 ? (
        <EmptyState icon={HeartPulse} title="Nenhum paciente cadastrado" description="Cadastre o primeiro para montar a rotina de cuidados." action={add} />
      ) : (
        <View className="gap-3">
          {patients.map((p) => <PatientCard key={p.id} patient={p} onPress={() => router.push(`/pacientes/${p.id}` as never)} />)}
        </View>
      )}
    </Screen>
  );
}
