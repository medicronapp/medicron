import { useEffect } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ErrorView } from "@/components/error-view";
import { HomeView } from "@/components/home/home-view";
import { Screen } from "@/components/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { NETWORK_MESSAGE } from "@/lib/api/errors";
import { isPlanLimit } from "@/lib/plan-limit";
import { useHome } from "@/lib/home-queries";

export default function Hoje() {
  const router = useRouter();
  const params = useLocalSearchParams<{ dia?: string }>();
  const dia = typeof params.dia === "string" ? params.dia : undefined;
  const query = useHome(dia);
  const staleError = query.isError && !!query.data;
  const historyLimit = isPlanLimit(query.error)?.limit === "history";

  // Dia além do histórico do plano grátis: volta para Hoje (que nunca é barrado) e mostra o paywall.
  useEffect(() => {
    if (!historyLimit) return;
    router.setParams({ dia: undefined });
    router.push("/plus?motivo=history" as never);
  }, [historyLimit, router]);

  // Falha ao atualizar com dados já na tela: mantém a tela e avisa (não troca tudo por uma tela de erro).
  useEffect(() => {
    if (staleError) toast.error(NETWORK_MESSAGE);
  }, [staleError, query.errorUpdatedAt]);

  if (query.isPending) {
    return (
      <Screen>
        <View accessibilityLabel="Carregando" aria-busy className="gap-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </View>
      </Screen>
    );
  }
  if (!query.data) {
    if (!query.isError || historyLimit) return null; // o paywall já foi aberto; nada de "Algo deu errado"
    return (
      <Screen>
        <ErrorView onRetry={() => void query.refetch()} />
      </Screen>
    );
  }

  const { home, hasPatients, onboarding } = query.data;
  return (
    <Screen testID="home-scroll" refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <HomeView
        home={home} hasPatients={hasPatients} onboarding={onboarding}
        onSelectDay={(key, isToday) => router.setParams({ dia: isToday ? undefined : key })}
        onBackToToday={() => router.setParams({ dia: undefined })}
        onNavigate={(href) => router.push(href as never)}
      />
    </Screen>
  );
}
