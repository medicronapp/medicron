import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Text } from "@/components/ui/text";
import { useColors } from "@/theme/colors";

/** Anel de progresso do cartão de sequência: arco `heroAccent` sobre trilho branco a 25 %, centro `heroCore`. */
export function ProgressRing({ resolved, total, size = 64 }: { resolved: number; total: number; size?: number }) {
  const colors = useColors();
  const pct = total === 0 ? 0 : Math.min(1, resolved / total);
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${resolved} de ${total} cuidados de hoje resolvidos`}
      style={{ width: size, height: size }}
      className="items-center justify-center"
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={colors.heroCore} />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.25)" strokeWidth={stroke} fill="none" />
        {pct > 0 ? (
          <Circle
            cx={size / 2} cy={size / 2} r={r} stroke={colors.heroAccent} strokeWidth={stroke} fill="none"
            strokeDasharray={`${c * pct} ${c}`} strokeLinecap="butt" rotation={-90} originX={size / 2} originY={size / 2}
          />
        ) : null}
      </Svg>
      <Text className="text-sm font-semibold text-white" style={{ fontVariant: ["tabular-nums"] }}>{resolved}/{total}</Text>
    </View>
  );
}
