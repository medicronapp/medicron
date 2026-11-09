import { useColorScheme } from "react-native";

/** Esquema de cores em uso ("light" | "dark"); no app nativo é o do aparelho (ou o fixado por `Appearance.setColorScheme`). */
export function useScheme(): "light" | "dark" {
  return useColorScheme() === "dark" ? "dark" : "light";
}
