import { Bird, Cat, Dog, PawPrint, Rabbit, User } from "lucide-react-native";
import type { Species } from "@medicron/shared";
import type { ThemeColors } from "@/theme/colors";
import { Icon } from "@/components/ui/icon";

/** Glifo (lucide) do tipo de paciente. */
export const speciesGlyph = (species: Species) => ({ cat: Cat, dog: Dog, human: User, bird: Bird, rabbit: Rabbit, other: PawPrint } as Record<string, typeof PawPrint>)[species] ?? PawPrint;

/** Ícone do tipo de paciente (decorativo: o rótulo vem sempre em texto ao lado). */
export function SpeciesIcon({ species, color = "foreground", size = 20 }: { species: Species; color?: keyof ThemeColors; size?: number }) {
  return <Icon icon={speciesGlyph(species)} color={color} size={size} />;
}
