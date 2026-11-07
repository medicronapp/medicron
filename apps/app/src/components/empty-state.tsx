import { View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

type Props = { icon: LucideIcon; title: string; description?: string };

export function EmptyState({ icon, title, description }: Props) {
  return (
    <View className="items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12">
      <View className="size-12 items-center justify-center rounded-full bg-brand-soft">
        <Icon icon={icon} color="brandInk" size={22} />
      </View>
      <Text accessibilityRole="header" className="text-center text-base font-semibold">{title}</Text>
      {description ? <Text className="text-center text-sm text-muted-foreground">{description}</Text> : null}
    </View>
  );
}
