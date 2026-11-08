import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ErrorView } from "@/components/error-view";
import { HomeView } from "@/components/home/home-view";
import { Screen } from "@/components/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { useHome } from "@/lib/home-queries";

export default function Hoje() {
  const router = useRouter();
  const params = useLocalSearchParams<{ dia?: string }>();
  const dia = typeof params.dia === "string" ? params.dia : undefined;
  const query = useHome(dia);

  if (query.isPending) {
    return (
      <View accessibilityLabel="Carregando" aria-busy className="gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </View>
    );
  }
  if (query.isError || !query.data) return <ErrorView onRetry={() => void query.refetch()} />;

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
