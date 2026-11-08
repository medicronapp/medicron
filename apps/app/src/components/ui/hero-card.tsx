import { View, type ViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { cn } from "@/lib/cn";
import { useColors } from "@/theme/colors";

/** Cartão com o degradê verde do site (`from-hero-from to-hero-to`, diagonal), claro e escuro. */
export function HeroCard({ className, children, ...rest }: ViewProps & { className?: string }) {
  const colors = useColors();
  return (
    <View className={cn("overflow-hidden rounded-2xl shadow-sm", className)} {...rest}>
      <LinearGradient colors={[colors.heroFrom, colors.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16, gap: 12 }}>
        {children}
      </LinearGradient>
    </View>
  );
}
