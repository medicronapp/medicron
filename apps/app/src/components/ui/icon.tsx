import type { LucideIcon } from "lucide-react-native";
import { useColors, type ThemeColors } from "@/theme/colors";

type Props = { icon: LucideIcon; color?: keyof ThemeColors; size?: number; strokeWidth?: number };

/** Ícone lucide com a cor do tema (ícones não herdam `className`, então a cor vem de `useColors`). */
export function Icon({ icon: Glyph, color = "foreground", size = 20, strokeWidth }: Props) {
  const colors = useColors();
  return <Glyph color={colors[color]} size={size} strokeWidth={strokeWidth} />;
}
