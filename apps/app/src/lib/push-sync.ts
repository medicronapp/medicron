import { useEffect } from "react";
import { syncPushRegistration } from "@/lib/push";
import { useAppSession } from "@/lib/session";

/** Com sessão e a permissão já concedida, mantém o token deste aparelho registrado (o token pode mudar). Melhor esforço. */
export function usePushSync() {
  const { status } = useAppSession();
  useEffect(() => {
    if (status !== "signedIn") return;
    void syncPushRegistration().catch(() => {});
  }, [status]);
}
