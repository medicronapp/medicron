import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { safeNext } from "@medicron/shared";
import { useAppSession } from "@/lib/session";

/** Destino da notificação: só um caminho interno (`safeNext`); qualquer outra coisa abre a Hoje. */
export function notificationTarget(data: unknown): string {
  const url = typeof data === "object" && data !== null ? (data as { url?: unknown }).url : undefined;
  return safeNext(typeof url === "string" ? url : null);
}

/**
 * Tocar na notificação abre o app no destino do `data.url`: com o app aberto, em segundo plano ou fechado (partida a
 * frio, tratada uma vez). Sem sessão pronta o destino fica guardado e a navegação acontece depois do login.
 */
export function useNotificationRouting() {
  const router = useRouter();
  const { status } = useAppSession();
  const routerRef = useRef(router);
  const statusRef = useRef(status);
  const pending = useRef<string | null>(null);
  const cold = useRef(false);

  // As refs acompanham o render mais recente (atualizadas em efeito, antes do listener que as lê).
  useEffect(() => {
    routerRef.current = router;
    statusRef.current = status;
  });

  useEffect(() => {
    if (Platform.OS === "web") return;
    const open = (data: unknown) => {
      const target = notificationTarget(data);
      if (statusRef.current === "signedIn") routerRef.current.navigate(target as never);
      else pending.current = target;
    };
    if (!cold.current) {
      cold.current = true;
      const last = Notifications.getLastNotificationResponse();
      if (last) {
        open(last.notification.request.content.data);
        Notifications.clearLastNotificationResponse();
      }
    }
    const subscription = Notifications.addNotificationResponseReceivedListener((r) => open(r.notification.request.content.data));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (status === "signedIn" && pending.current) {
      const target = pending.current;
      pending.current = null;
      router.navigate(target as never);
    }
  }, [status, router]);
}
