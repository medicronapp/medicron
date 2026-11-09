import { subscribeWebPush, unsubscribeWebPush } from "@/lib/api/web-push";
import type { PushState } from "./push-state";

export type { PushState };

const UNREGISTER_TIMEOUT_MS = 3000;

function urlBase64ToUint8Array(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const vapidKey = () => process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
const hasServiceWorker = () => typeof navigator !== "undefined" && "serviceWorker" in navigator;
const hasPushManager = () => typeof window !== "undefined" && "PushManager" in window;

async function currentSubscription() {
  if (!hasServiceWorker()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** Estado do Web Push neste navegador. "enabled" = permissão concedida **e** inscrição ativa. */
export async function getPushState(): Promise<PushState> {
  if (typeof navigator === "undefined") return "unsupported";
  if (!hasServiceWorker() || !hasPushManager()) {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches;
    return ios && !standalone ? "needs-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  await navigator.serviceWorker.register("/sw.js");
  const sub = await currentSubscription();
  return sub && Notification.permission === "granted" ? "enabled" : "default";
}

/** Pede a permissão, inscreve no navegador e registra no servidor. Lança se o servidor recusar (e desfaz a inscrição). */
export async function enablePush(): Promise<"enabled" | "denied" | "no-project"> {
  const key = vapidKey();
  if (!key) return "no-project";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "denied";
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
  });
  try {
    await subscribeWebPush(sub.toJSON());
  } catch (e) {
    await sub.unsubscribe().catch(() => {});
    throw e;
  }
  return "enabled";
}

/** Remove a inscrição do servidor e depois do navegador. Lança se o servidor não confirmou (a local fica, para o estado não mentir). */
export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await unsubscribeWebPush(sub.endpoint);
  await sub.unsubscribe();
}

/**
 * Ao sair ou excluir a conta: tenta o servidor e remove SEMPRE a inscrição do navegador (a sessão pode já ter acabado,
 * como na exclusão de conta; deixar a local viva faria o próximo login ver "ativado" sem registro no servidor).
 * Com limite de tempo; sair nunca pode travar nem falhar por isso.
 */
export async function unregisterThisDevice(): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<void>((resolve) => { timer = setTimeout(resolve, UNREGISTER_TIMEOUT_MS); });
  const run = async () => {
    const sub = await currentSubscription();
    if (!sub) return;
    await unsubscribeWebPush(sub.endpoint).catch(() => {}); // offline ou sessão encerrada: o servidor limpa quando o serviço de push disser que morreu
    await sub.unsubscribe();
  };
  try {
    await Promise.race([run().catch(() => {}), limit]);
  } finally {
    clearTimeout(timer);
  }
}

/** Na web a inscrição é feita só por escolha do usuário: não há sincronização automática. */
export const syncPushRegistration = async (): Promise<void> => {};
