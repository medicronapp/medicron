import { useScheme } from "./use-scheme";
import { COLORS, type ThemeColors } from "./colors.generated";

export { COLORS };
export type { ThemeColors };

/** Cores (hex) do tema em uso, para ícones e SVG; mudam na hora quando o tema (do sistema ou escolhido) muda. */
export function useColors(): ThemeColors {
  return useScheme() === "dark" ? COLORS.dark : COLORS.light;
}
