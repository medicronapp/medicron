import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";

/** Seção de formulário em cartão com legenda (o `fieldset` do site): agrupa campos relacionados. */
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-4 rounded-2xl border border-border bg-card p-4">
      <Text className="px-1 text-sm font-semibold text-muted-foreground">{title}</Text>
      {children}
    </View>
  );
}
