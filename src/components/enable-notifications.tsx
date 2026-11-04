"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type State = "loading" | "unsupported" | "needs-install" | "default" | "denied" | "enabled";

function urlBase64ToUint8Array(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function EnableNotifications({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return setState(ios && !standalone ? "needs-install" : "unsupported");
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setState(sub && Notification.permission === "granted" ? "enabled" : "default");
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return setState(perm === "denied" ? "denied" : "default");
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    });
    const res = await fetch("/api/push/subscribe", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub.toJSON()),
    });
    if (!res.ok) return toast.error("Não foi possível ativar as notificações.");
    setState("enabled");
    toast.success("Notificações ativadas neste aparelho");
  }

  async function disable() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", {
        method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
    setState("default");
  }

  if (state === "loading" || state === "unsupported") return null;
  if (state === "enabled") {
    return compact ? null : (
      <div className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
        <span>🔔 Notificações ativadas neste aparelho</span>
        <Button variant="outline" size="sm" className="h-10" onClick={disable}>Desativar</Button>
      </div>
    );
  }
  return (
    <div className="grid gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
      {state === "needs-install" && (
        <p>No iPhone, para receber avisos: toque em Compartilhar → <b>Adicionar à Tela de Início</b> e abra o Medicron por lá.</p>
      )}
      {state === "denied" && <p>As notificações estão bloqueadas. Libere nas configurações do navegador para receber os avisos.</p>}
      {state === "default" && (
        <>
          <p>🔔 Receba um aviso no celular quando chegar a hora de cada medicação.</p>
          <Button className="h-11" onClick={enable}>Ativar notificações</Button>
        </>
      )}
    </div>
  );
}
