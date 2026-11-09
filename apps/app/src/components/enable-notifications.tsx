import { useEffect, useRef, useState } from "react";
import { Linking, Platform, View } from "react-native";
import { BellOff, BellRing } from "lucide-react-native";
import { disablePush, enablePush, getPushState, type PushState } from "@/lib/push";
import { Button, buttonLabel } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";

/** Convite para ativar os lembretes no aparelho (Hoje, compacto) e o estado das notificações (Conta). */
export function EnableNotifications({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const working = useRef(false); // dois toques seguidos registram uma vez só

  useEffect(() => {
    let alive = true;
    getPushState().then((s) => { if (alive) setState(s); }).catch(() => { if (alive) setState("unsupported"); });
    return () => { alive = false; };
  }, []);

  async function enable() {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    try {
      const result = await enablePush();
      if (result === "enabled") {
        setState("enabled");
        toast.success("Notificações ativadas neste aparelho");
      } else if (result === "denied") {
        setState("denied");
      } else {
        toast.error("Notificações indisponíveis nesta versão do app.");
      }
    } catch {
      toast.error("Não foi possível ativar as notificações.");
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  async function disable() {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    try {
      await disablePush();
      setState("default");
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  if (state === null || state === "unsupported") return null;

  if (state === "enabled") {
    if (compact) return null;
    return (
      <View className="flex-row items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <View className="size-10 items-center justify-center rounded-full bg-success-soft">
            <Icon icon={BellRing} color="successInk" size={20} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-medium">Notificações ativadas</Text>
            <Text className="text-sm text-muted-foreground">Você será avisado neste aparelho.</Text>
          </View>
        </View>
        <Button variant="outline" disabled={busy} onPress={() => void disable()} accessibilityLabel="Desativar">
          <Icon icon={BellOff} color="foreground" size={16} />
          <Text className={buttonLabel("outline", "default")}>Desativar</Text>
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-brand-40 bg-brand-soft p-4">
      <View className="size-10 items-center justify-center rounded-full bg-background">
        <Icon icon={BellRing} color="brandInk" size={20} />
      </View>
      {state === "needs-install" ? (
        <Text className="min-w-0 flex-1 text-sm text-brand-ink">
          No iPhone, para receber avisos: toque em Compartilhar → <Text className="font-semibold text-brand-ink">Adicionar à Tela de Início</Text> e abra o Medicron por lá.
        </Text>
      ) : state === "denied" ? (
        <View className="min-w-0 flex-1 gap-3">
          <Text className="text-sm text-brand-ink">
            {Platform.OS === "web"
              ? "As notificações estão bloqueadas. Libere nas configurações do navegador para receber os avisos."
              : "As notificações estão bloqueadas. Libere nas configurações do aparelho para receber os avisos."}
          </Text>
          {Platform.OS !== "web" && (
            <Button variant="outline" onPress={() => void Linking.openSettings()} accessibilityLabel="Abrir configurações">Abrir configurações</Button>
          )}
        </View>
      ) : (
        <View className="min-w-0 flex-1 flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="font-medium text-brand-ink">Receba avisos no celular</Text>
            <Text className="text-sm text-brand-ink">Um alerta na hora de cada medicação ou cuidado.</Text>
          </View>
          <Button loading={busy} onPress={() => void enable()} accessibilityLabel="Ativar notificações">Ativar</Button>
        </View>
      )}
    </View>
  );
}
