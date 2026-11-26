import { Pressable, View } from "react-native";
import { Check } from "lucide-react-native";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";
import { Text } from "./text";

type Props = { title: string; subtitle?: string; selected: boolean; onPress: () => void };

/** Cartão de escolha única, com marca de seleção à esquerda, título e uma linha de apoio. */
export function ChoiceCard({ title, subtitle, selected, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ selected }} onPress={onPress}
      className={cn("min-h-14 flex-row items-center gap-3 rounded-2xl border px-4 py-3", selected ? "border-primary bg-brand-soft" : "border-border bg-card active:bg-muted")}
    >
      <View className={cn("size-6 items-center justify-center rounded-full border-2", selected ? "border-primary bg-primary" : "border-input bg-card")}>
        {selected ? <Icon icon={Check} color="primaryForeground" size={14} strokeWidth={3} /> : null}
      </View>
      <View className="min-w-0 flex-1">
        <Text className={cn("text-base font-semibold", selected && "text-brand-ink")}>{title}</Text>
        {subtitle ? <Text className="text-sm text-muted-foreground">{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}
