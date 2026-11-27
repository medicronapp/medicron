import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { cn } from "@/lib/cn";
import { Text } from "./text";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; title: string; children: ReactNode; footer?: ReactNode; /** Diálogo estreito (ex.: só um calendário). */ narrow?: boolean };

/** Diálogo centralizado (para telas largas): fundo escurecido, tocar fora ou Esc fecha. */
export function Dialog({ open, onOpenChange, title, children, footer, narrow }: Props) {
  return (
    <Modal transparent visible={open} animationType="fade" onRequestClose={() => onOpenChange(false)}>
      <View className="flex-1 items-center justify-center p-4">
        {/* O fundo é irmão do cartão (não pai): no navegador, um clique dentro do cartão nunca sobe até ele e fecha o diálogo. */}
        <Pressable accessibilityLabel="Fechar" onPress={() => onOpenChange(false)} style={StyleSheet.absoluteFill} className="bg-black/40" />
        <View accessibilityViewIsModal className={cn("w-full gap-4 rounded-2xl border border-border bg-popover p-5 shadow-lg", narrow ? "max-w-md" : "max-w-2xl")}>
          <Text accessibilityRole="header" className="text-lg font-semibold">{title}</Text>
          {children}
          {footer}
        </View>
      </View>
    </Modal>
  );
}
