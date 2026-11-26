import { Pressable } from "react-native";
import { cn } from "@/lib/cn";
import { Text } from "./text";

type Props = { label: string; selected: boolean; onPress: () => void };

/** Botão de escolha em pílula (44 px de toque): o selecionado ganha a cor da marca e borda mais forte. */
export function Chip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress}
      className={cn("h-11 flex-row items-center rounded-full border px-4", selected ? "border-primary bg-brand-soft" : "border-border bg-card active:bg-muted")}
    >
      <Text className={cn("text-base font-medium", selected && "text-brand-ink")}>{label}</Text>
    </Pressable>
  );
}
