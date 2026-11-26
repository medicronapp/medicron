import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Sparkles } from "lucide-react-native";
import { useColors } from "@/theme/colors";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

type Props = { title: string; subtitle?: string; topInset?: number };

/** Topo promocional do Plus (mesmo estilo da oferta de boas-vindas): degradê da marca, ícone inclinado, título e o motivo. */
export function PlusHero({ title, subtitle, topInset = 0 }: Props) {
  const colors = useColors();
  return (
    <View testID="plus-hero" className="overflow-hidden rounded-b-[34px]">
      <LinearGradient colors={[colors.heroFrom, colors.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ alignItems: "center", paddingTop: topInset + 18, paddingBottom: 36, paddingHorizontal: 24, gap: 4 }}>
        <View className="size-14 items-center justify-center rounded-[18px] bg-white shadow-lg" style={{ transform: [{ rotate: "-6deg" }] }}>
          <Icon icon={Sparkles} color="brandInk" size={28} />
        </View>
        <Text accessibilityRole="header" className="mt-2 text-center text-[26px] font-semibold leading-8 tracking-tight text-white">{title}</Text>
        {subtitle ? <Text className="text-center text-sm text-white/90">{subtitle}</Text> : null}
      </LinearGradient>
    </View>
  );
}
