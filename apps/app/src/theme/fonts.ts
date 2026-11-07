import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold } from "@expo-google-fonts/geist";

/** Passado ao `useFonts`: carrega a Geist (a mesma fonte do site) nos quatro pesos usados. */
export const GEIST_FONTS = { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold };

const WEIGHT_TO_FAMILY: Record<string, string> = {
  "font-normal": "Geist_400Regular",
  "font-medium": "Geist_500Medium",
  "font-semibold": "Geist_600SemiBold",
  "font-bold": "Geist_700Bold",
};

/** No nativo o peso vem da família da fonte, não de `fontWeight`: lê a classe de peso e devolve a família. */
export function fontFamilyFor(className = ""): string {
  let family = "Geist_400Regular";
  for (const c of className.split(/\s+/)) if (c in WEIGHT_TO_FAMILY) family = WEIGHT_TO_FAMILY[c];
  return family;
}
