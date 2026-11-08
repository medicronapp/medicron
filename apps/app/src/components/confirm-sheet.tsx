import { useRef, useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { toast } from "@/components/ui/toast";

type Props = {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; confirmLabel: string;
  onConfirm: () => Promise<void> | void;
};

/** Confirmação de ação destrutiva (o `Dialog` do site vira um sheet): "Cancelar" e o botão vermelho. */
export function ConfirmSheet({ open, onOpenChange, title, description, confirmLabel, onConfirm }: Props) {
  const [pending, setPending] = useState(false);
  const busy = useRef(false); // dois toques seguidos executam uma vez só

  async function confirm() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Algo deu errado. Tente de novo.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <View className="flex-row gap-2">
        <Button variant="outline" size="lg" className="flex-1" onPress={() => onOpenChange(false)}>Cancelar</Button>
        <Button variant="destructive" size="lg" className="flex-1" disabled={pending} onPress={() => void confirm()} accessibilityLabel={pending ? "Aguarde…" : confirmLabel}>
          {pending ? "Aguarde…" : confirmLabel}
        </Button>
      </View>
    </Drawer>
  );
}
