import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

type Props = { title: string; description?: string; onBack?: () => void; actions?: ReactNode };

/** Título da tela, com voltar (`onBack`) e ações à direita, como o `PageHeader` do site. */
export function PageHeader({ title, description, onBack, actions }: Props) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={onBack} className="-ml-2 size-11 items-center justify-center rounded-lg active:bg-muted">
            <Icon icon={ChevronLeft} color="muted" size={20} />
          </Pressable>
        ) : null}
        <View className="min-w-0 flex-1 gap-1">
          <Text accessibilityRole="header" numberOfLines={1} className="text-2xl font-semibold tracking-tight">{title}</Text>
          {description ? <Text numberOfLines={2} className="text-sm text-muted-foreground">{description}</Text> : null}
        </View>
      </View>
      {actions ? <View className="flex-row items-center gap-2">{actions}</View> : null}
    </View>
  );
}
