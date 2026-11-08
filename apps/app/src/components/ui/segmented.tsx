import { Pressable, View } from "react-native";
import { cn } from "@/lib/cn";
import { Text } from "./text";

type Props = { items: { key: string; label: string }[]; value: string; onChange: (key: string) => void; accessibilityLabel: string };

/** Abas em trilho (`SegmentedLinks` do site): o ativo em cartão com sombra, itens de 44 px. */
export function Segmented({ items, value, onChange, accessibilityLabel }: Props) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} className="flex-row gap-1 rounded-xl bg-muted p-1">
      {items.map((i) => {
        const on = i.key === value;
        return (
          <Pressable
            key={i.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(i.key)}
            className={cn("h-11 flex-1 items-center justify-center rounded-lg", on && "bg-card shadow-sm")}
          >
            <Text className={cn("text-sm font-medium", on ? "text-foreground" : "text-muted-foreground")}>{i.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
