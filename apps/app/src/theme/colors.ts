import { useColorScheme } from "react-native";
import { COLORS, type ThemeColors } from "./colors.generated";

export { COLORS };
export type { ThemeColors };

/** Cores (hex) do tema do sistema, para ícones e SVG; muda na hora quando o sistema troca o tema. */
export function useColors(): ThemeColors {
  return useColorScheme() === "dark" ? COLORS.dark : COLORS.light;
}
