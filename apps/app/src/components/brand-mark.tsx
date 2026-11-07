import { View, type ViewProps } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { cn } from "@/lib/cn";
import { useColors } from "@/theme/colors";

type Props = ViewProps & { className?: string; size?: number; ringColor?: string };

/** Logo Ciclo: anel quase fechado com a dose marcada na abertura (igual ao do site). Decorativo. */
export function BrandMark({ className, size = 24, ringColor, ...rest }: Props) {
  const colors = useColors();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn("size-9 items-center justify-center rounded-xl bg-primary shadow-sm", className)}
      {...rest}
    >
      <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <Circle
          cx="32" cy="32" r="20" stroke={ringColor ?? colors.primaryForeground} strokeWidth="6"
          strokeLinecap="round" strokeDasharray="104 21.7" transform="rotate(-90 32 32)"
        />
        <Circle cx="22" cy="14.7" r="5.2" fill="#99f6e4" />
      </Svg>
    </View>
  );
}
