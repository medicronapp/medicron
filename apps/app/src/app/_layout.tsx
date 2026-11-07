import "../global.css";
import { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { GEIST_FONTS } from "@/theme/fonts";
import { apiClient } from "@/lib/api";
import { AppOutdatedError } from "@/lib/api/errors";
import { fetchMe } from "@/lib/api/me";
import { queryClient } from "@/lib/api/query";
import { decideRoute } from "@/lib/route-guard";
import { useAppSession } from "@/lib/session";
import { Toaster } from "@/components/ui/toast";
import { SessionError } from "@/components/session-error";
import { UpdateRequired } from "@/components/update-required";

SplashScreen.preventAutoHideAsync();

/** Aplica a guarda de rotas e troca tudo pela tela de atualização quando a API recusa esta versão. */
function Gate() {
  const session = useAppSession();
  const pathname = usePathname();
  const router = useRouter();
  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe(apiClient), enabled: session.status === "signedIn" });

  const decision =
    session.status === "loading" || session.status === "error"
      ? { to: null }
      : decideRoute({ hasSession: session.status === "signedIn", orgCount: session.orgCount, activeOrgId: session.activeOrgId, pathname });

  useEffect(() => {
    if (decision.to) router.replace(decision.to as never);
  }, [decision.to, router]);

  if (me.error instanceof AppOutdatedError) return <UpdateRequired minVersion={me.error.minAppVersion} />;
  if (session.status === "error") return <SessionError onRetry={session.retry} />;
  // Sem casca enquanto a sessão carrega ou o redirecionamento está pendente (evita o flash de telas logadas).
  if (session.status === "loading" || decision.to) return <View className="flex-1 bg-background" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const [loaded, error] = useFonts(GEIST_FONTS);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  // A tela de abertura segue visível até a Geist carregar (ou falhar: aí cai na fonte do sistema).
  if (!loaded && !error) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <StatusBar style="auto" />
            <Gate />
            <Toaster />
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
