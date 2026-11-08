import type { LucideIcon } from "lucide-react-native";
import { useColors, type ThemeColors } from "@/theme/colors";

type Props = { icon: LucideIcon; color?: keyof ThemeColors | `#${string}`; size?: number; strokeWidth?: number };

/** Ícone lucide com a cor do tema (ícones não herdam `className`, então a cor vem de `useColors`). */
export function Icon({ icon: Glyph, color = "foreground", size = 20, strokeWidth }: Props) {
  const colors = useColors();
  return <Glyph color={color.startsWith("#") ? color : colors[color as keyof ThemeColors]} size={size} strokeWidth={strokeWidth} />;
}
