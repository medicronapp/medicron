import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Text } from "@/components/ui/text";
import { useColors } from "@/theme/colors";

/** Caminho SVG do arco que cobre `pct` (0–1) da circunferência, começando no topo. */
function arc(c: number, r: number, pct: number): string {
  const a = 2 * Math.PI * pct;
  const x = c + r * Math.sin(a), y = c - r * Math.cos(a);
  return `M ${c} ${c - r} A ${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${x.toFixed(3)} ${y.toFixed(3)}`;
}

/** Anel de progresso do cartão de sequência: arco `heroAccent` sobre trilho branco a 25 %, centro `heroCore`. */
export function ProgressRing({ resolved, total, size = 64 }: { resolved: number; total: number; size?: number }) {
  const colors = useColors();
  const pct = total === 0 ? 0 : Math.min(1, resolved / total);
  const stroke = 8;
  const r = (size - stroke) / 2;
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
        {pct >= 1 ? (
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.heroAccent} strokeWidth={stroke} fill="none" />
        ) : pct > 0 ? (
          // Arco a partir do topo, no sentido horário (sem transform: o atributo de origem é inválido no DOM da web).
          <Path d={arc(size / 2, r, pct)} stroke={colors.heroAccent} strokeWidth={stroke} fill="none" />
        ) : null}
      </Svg>
      <Text className="text-sm font-semibold text-white" style={{ fontVariant: ["tabular-nums"] }}>{resolved}/{total}</Text>
    </View>
  );
}
