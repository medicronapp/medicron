import type { ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
import { cn } from "@/lib/cn";
import { Text } from "./text";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; title: string; children: ReactNode; footer?: ReactNode; /** Diálogo estreito (ex.: só um calendário). */ narrow?: boolean };

/** Diálogo centralizado (para telas largas): fundo escurecido, tocar fora ou Esc fecha. */
export function Dialog({ open, onOpenChange, title, children, footer, narrow }: Props) {
  return (
    <Modal transparent visible={open} animationType="fade" onRequestClose={() => onOpenChange(false)}>
      <Pressable accessibilityLabel="Fechar" onPress={() => onOpenChange(false)} className="flex-1 items-center justify-center bg-black/40 p-4">
        {/* O toque dentro do cartão não chega ao fundo (senão fecharia o diálogo). */}
        <View onStartShouldSetResponder={() => true} accessibilityViewIsModal className={cn("w-full gap-4 rounded-2xl border border-border bg-popover p-5 shadow-lg", narrow ? "max-w-sm" : "max-w-2xl")}>
          <Text accessibilityRole="header" className="text-lg font-semibold">{title}</Text>
          {children}
          {footer}
        </View>
      </Pressable>
    </Modal>
  );
}
