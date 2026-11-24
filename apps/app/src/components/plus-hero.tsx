import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Sparkles } from "lucide-react-native";
import { useColors } from "@/theme/colors";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

type Props = { eyebrow?: string; title: string; subtitle?: string; compact?: boolean };

/** Topo promocional do Plus: degradê da marca, selo, título de oportunidade e o motivo. Usado no paywall e na oferta de boas-vindas. */
export function PlusHero({ eyebrow, title, subtitle, compact = false }: Props) {
  const colors = useColors();
  return (
    <View testID="plus-hero" className="overflow-hidden rounded-3xl">
      <LinearGradient colors={[colors.heroFrom, colors.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: compact ? 16 : 20, gap: compact ? 8 : 12 }}>
        <View className="flex-row items-center gap-2">
          <View className="size-9 items-center justify-center rounded-full bg-white/20">
            <Icon icon={Sparkles} color="#ffffff" size={18} />
          </View>
          {eyebrow ? (
            <View className="rounded-full bg-white/20 px-3 py-1">
              <Text className="text-xs font-semibold uppercase tracking-wider text-white">{eyebrow}</Text>
            </View>
          ) : null}
        </View>
        <Text accessibilityRole="header" className={compact ? "text-2xl font-semibold leading-8 tracking-tight text-white" : "text-3xl font-semibold leading-9 tracking-tight text-white"}>{title}</Text>
        {subtitle ? <Text className={compact ? "text-sm text-white/90" : "text-base text-white/90"}>{subtitle}</Text> : null}
      </LinearGradient>
    </View>
  );
}
