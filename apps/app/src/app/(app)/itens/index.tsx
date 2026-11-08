import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pill, Stethoscope } from "lucide-react-native";
import { AddButton } from "@/components/add-button";
import { EmptyState } from "@/components/empty-state";
import { ErrorView } from "@/components/error-view";
import { ItemCard } from "@/components/item-card";
import { PageHeader } from "@/components/page-header";
import { Screen } from "@/components/screen";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { kindFromParam } from "@/lib/item-kind";
import { useItems } from "@/lib/item-queries";

export default function Itens() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tipo?: string }>();
  const kind = kindFromParam(params.tipo);
  const query = useItems(kind);
  const add = <AddButton label="Novo" onPress={() => router.push(`/itens/novo?tipo=${kind}` as never)} />;

  const header = (
    <>
      <PageHeader title="Itens" description="Medicações e procedimentos que entram nas rotinas." actions={add} />
      <Segmented
        accessibilityLabel="Tipo de item" value={kind} onChange={(tipo) => router.setParams({ tipo })}
        items={[{ key: "medication", label: "Medicações" }, { key: "procedure", label: "Procedimentos" }]}
      />
    </>
  );

  if (query.isPending) {
    return (
      <Screen>
        <View accessibilityLabel="Carregando" aria-busy className="gap-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-11 w-full rounded-xl" />
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

  const items = query.data;
  const procedure = kind === "procedure";
  return (
    <Screen testID="items-scroll" refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      {header}
      {items.length === 0 ? (
        <EmptyState
          icon={procedure ? Stethoscope : Pill}
          title={procedure ? "Nenhum procedimento" : "Nenhuma medicação"}
          description={procedure ? "Ex.: medir temperatura, limpar um ferimento." : "Ex.: antibiótico, anti-inflamatório, vitamina."}
          action={add}
        />
      ) : (
        <View className="gap-3">
          {items.map((i) => <ItemCard key={i.id} item={i} onPress={() => router.push(`/itens/${i.id}` as never)} />)}
        </View>
      )}
    </Screen>
  );
}
