import "../global.css";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { GEIST_FONTS } from "@/theme/fonts";
import { AppOutdatedError } from "@/lib/api/errors";
import { useMe } from "@/lib/me-query";
import { applyThemePref, loadThemePref } from "@/lib/theme-pref";
import { setupNotificationHandler } from "@/lib/notification-handler";
import { useNotificationRouting } from "@/lib/notification-routing";
import { usePushSync } from "@/lib/push-sync";
import { useWidgetSync } from "@/lib/widget-sync";
import { bindFocusToAppState } from "@/lib/api/focus";
import { queryClient } from "@/lib/api/query";
import { decideRoute } from "@/lib/route-guard";
import { useAppSession } from "@/lib/session";
import { Toaster } from "@/components/ui/toast";
import { SessionError } from "@/components/session-error";
import { UpdateRequired } from "@/components/update-required";

SplashScreen.preventAutoHideAsync();
bindFocusToAppState();
setupNotificationHandler();

/** Aplica a guarda de rotas e troca tudo pela tela de atualização quando a API recusa esta versão. */
function Gate() {
  const session = useAppSession();
  const path = usePathname();
  const { next } = useGlobalSearchParams<{ next?: string }>();
  // `usePathname` não traz a query: devolve o `next` para a guarda levar ao destino guardado depois do login/cadastro.
  const pathname = typeof next === "string" && next ? `${path}?next=${encodeURIComponent(next)}` : path;
  const router = useRouter();
  const me = useMe();
  usePushSync();
  useWidgetSync();
  useNotificationRouting();

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
  const [themeReady, setThemeReady] = useState(false);

  // O tema escolhido vale já na abertura: aplica antes de a tela de abertura sumir (sem piscar o tema errado).
  useEffect(() => {
    void loadThemePref().then((pref) => { applyThemePref(pref); setThemeReady(true); });
  }, []);

  const ready = (loaded || !!error) && themeReady;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // A tela de abertura segue visível até a Geist carregar (ou falhar: aí cai na fonte do sistema) e o tema ser aplicado.
  if (!ready) return null;
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
