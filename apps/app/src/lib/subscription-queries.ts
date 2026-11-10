import { FREE_LIMITS } from "@medicron/shared";
import { apiClient } from "@/lib/api";
import { queryClient } from "@/lib/api/query";
import { syncSubscription } from "@/lib/api/subscription";
import { useMe } from "@/lib/me-query";

/** A assinatura da conta (do `/me`). Enquanto carrega, vale o **grátis**: nunca libera por engano. */
export function useSubscription() {
  const me = useMe();
  const subscription = me.data?.subscription ?? null;
  return {
    subscription,
    isPlus: subscription?.tier === "plus",
    limits: subscription?.limits ?? FREE_LIMITS,
    isPending: me.isPending,
    refetch: me.refetch,
  };
}

/**
 * Depois de uma compra: pede à API para sincronizar com o RevenueCat e repete a cada 2 s (até ~20 s) até a conta virar Plus,
 * porque o webhook pode demorar alguns segundos. Devolve se virou Plus. Falha da sincronização não interrompe as tentativas.
 */
export async function afterPurchase({ intervalMs = 2000, timeoutMs = 20_000 } = {}): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const sub = await syncSubscription(apiClient);
      if (sub.tier === "plus") {
        await queryClient.invalidateQueries({ queryKey: ["me"] });
        return true;
      }
    } catch {
      // tenta de novo
    }
    if (Date.now() + intervalMs > deadline) return false;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
