import { Cat, Dog, PawPrint, User } from "lucide-react-native";
import type { Species } from "@medicron/shared";
import type { ThemeColors } from "@/theme/colors";
import { Icon } from "@/components/ui/icon";

/** Ícone do tipo de paciente (decorativo: o rótulo vem sempre em texto ao lado). */
export function SpeciesIcon({ species, color = "foreground", size = 20 }: { species: Species; color?: keyof ThemeColors; size?: number }) {
  const glyph = species === "cat" ? Cat : species === "dog" ? Dog : species === "human" ? User : PawPrint;
  return <Icon icon={glyph} color={color} size={size} />;
}
