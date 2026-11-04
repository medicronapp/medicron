"use client";
import { useEffect, useState } from "react";
import { BellOff, BellRing } from "lucide-react";
import { toast } from "sonner";
import { unsubscribePush } from "@/lib/push/client";
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
    await unsubscribePush();
    setState("default");
  }

  if (state === "loading" || state === "unsupported") return null;
  if (state === "enabled") {
    return compact ? null : (
      <div className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-soft text-success-ink">
            <BellRing aria-hidden className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">Notificações ativadas</p>
            <p className="text-sm text-muted-foreground">Você será avisado neste aparelho.</p>
          </div>
        </div>
        <Button variant="outline" onClick={disable}><BellOff aria-hidden /> Desativar</Button>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand-soft p-4 text-brand-ink">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background/70">
        <BellRing aria-hidden className="size-5" />
      </span>
      <div className="grid min-w-0 flex-1 gap-3">
        {state === "needs-install" && (
          <p className="text-sm">No iPhone, para receber avisos: toque em Compartilhar → <b>Adicionar à Tela de Início</b> e abra o Medicron por lá.</p>
        )}
        {state === "denied" && (
          <p className="text-sm">As notificações estão bloqueadas. Libere nas configurações do navegador para receber os avisos.</p>
        )}
        {state === "default" && (
          <>
            <div>
              <p className="font-medium">Receba avisos no celular</p>
              <p className="text-sm">Um alerta na hora de cada medicação ou cuidado.</p>
            </div>
            <Button className="justify-self-start" onClick={enable}>Ativar notificações</Button>
          </>
        )}
      </div>
    </div>
  );
}
