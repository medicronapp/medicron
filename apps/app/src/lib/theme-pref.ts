import { Appearance } from "react-native";
import * as SecureStore from "expo-secure-store";

export type ThemePref = "light" | "dark" | "system";
const KEY = "medicron.theme";
const VALID: ThemePref[] = ["light", "dark", "system"];

/** Preferência de tema guardada no aparelho; sem valor (ou valor inválido) é "system". */
export async function loadThemePref(): Promise<ThemePref> {
  try {
    const v = await SecureStore.getItemAsync(KEY);
    return VALID.includes(v as ThemePref) ? (v as ThemePref) : "system";
  } catch {
    return "system";
  }
}

export async function saveThemePref(pref: ThemePref): Promise<void> {
  await SecureStore.setItemAsync(KEY, pref);
}

/** Claro e escuro fixam o tema do app (também o das cores de ícones e SVG, que seguem `useColorScheme`); "system" volta a seguir o aparelho. */
export function applyThemePref(pref: ThemePref): void {
  Appearance.setColorScheme(pref === "system" ? "unspecified" : pref);
}
