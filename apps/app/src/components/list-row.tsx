import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { ChevronRight, type LucideIcon } from "lucide-react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

type Props = {
  icon: LucideIcon; title: string; subtitle?: string;
  /** Com `onPress` a linha inteira é um toque (com seta); sem ele é um bloco que aceita `trailing`. */
  onPress?: () => void; trailing?: ReactNode; children?: ReactNode;
};

/** Linha de lista com ícone, título e subtítulo: padrão de Itens, reaproveitado nas rotinas do paciente. */
export function ListRow({ icon, title, subtitle, onPress, trailing, children }: Props) {
  const content = (
    <>
      <View className="size-12 items-center justify-center rounded-full bg-brand-soft">
        <Icon icon={icon} color="brandInk" size={20} />
      </View>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-base font-semibold">{title}</Text>
        {subtitle ? <Text numberOfLines={1} className="text-sm text-muted-foreground">{subtitle}</Text> : null}
        {children}
      </View>
    </>
  );
  const box = "flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3.5";
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} className={`${box} active:bg-muted`}>
        {content}
        <Icon icon={ChevronRight} color="muted" size={20} />
      </Pressable>
    );
  }
  return (
    <View className={box}>
      {content}
      {trailing ? <View className="flex-row items-center gap-2">{trailing}</View> : null}
    </View>
  );
}
