/** Remove a inscrição de push deste aparelho (servidor e navegador). Nunca lança: sair não pode falhar por isso. */
export async function unsubscribePush(): Promise<void> {
  try {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    await sub.unsubscribe();
  } catch {
    // sem service worker, offline ou sessão já expirada: segue o logout normalmente
  }
}
