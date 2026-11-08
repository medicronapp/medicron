import { Cat, Dog, PawPrint, User } from "lucide-react-native";
import type { Species } from "@medicron/shared";
import type { ThemeColors } from "@/theme/colors";
import { Icon } from "@/components/ui/icon";

/** Glifo (lucide) do tipo de paciente. */
export const speciesGlyph = (species: Species) => (species === "cat" ? Cat : species === "dog" ? Dog : species === "human" ? User : PawPrint);

/** Ícone do tipo de paciente (decorativo: o rótulo vem sempre em texto ao lado). */
export function SpeciesIcon({ species, color = "foreground", size = 20 }: { species: Species; color?: keyof ThemeColors; size?: number }) {
  return <Icon icon={speciesGlyph(species)} color={color} size={size} />;
}
