import { setThemePref } from "@/lib/theme-store.web";
import { COLORS } from "@/theme/colors.generated";

export type ThemePref = "light" | "dark" | "system";
const KEY = "medicron.theme"; // a mesma chave do app nativo; o script do <head> do index.html lê a mesma
const VALID: ThemePref[] = ["light", "dark", "system"];

/** Preferência guardada no navegador; sem valor, inválida ou com o armazenamento bloqueado é "system". */
export async function loadThemePref(): Promise<ThemePref> {
  try {
    const v = localStorage.getItem(KEY);
    return VALID.includes(v as ThemePref) ? (v as ThemePref) : "system";
  } catch {
    return "system";
  }
}

export async function saveThemePref(pref: ThemePref): Promise<void> {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    // modo privado ou armazenamento bloqueado: a escolha vale só nesta visita
  }
}

/** Claro e escuro fixam o tema (data-theme no <html>, que vence o `prefers-color-scheme` do CSS); "system" volta a seguir o aparelho. */
export function applyThemePref(pref: ThemePref): void {
  const root = document.documentElement;
  if (pref === "system") delete root.dataset.theme;
  else root.dataset.theme = pref;
  setThemePref(pref);
  syncBrowserChrome(pref);
}

const BG = { light: COLORS.light.background, dark: COLORS.dark.background };

/** Barra de status do iPhone e cor do tema do Safari acompanham o esquema resolvido (a escolha, ou o aparelho em "Padrão"). */
function syncBrowserChrome(pref: ThemePref): void {
  const systemDark = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const dark = pref === "dark" || (pref === "system" && systemDark);
  const meta = (sel: string) => document.querySelector(sel);
  meta('meta[name="apple-mobile-web-app-status-bar-style"]')?.setAttribute("content", dark ? "black-translucent" : "default");
  const light = meta('meta[name="theme-color"][media*="light"]');
  const night = meta('meta[name="theme-color"][media*="dark"]');
  if (pref === "system") {
    light?.setAttribute("content", BG.light);
    night?.setAttribute("content", BG.dark);
  } else {
    const color = BG[pref];
    light?.setAttribute("content", color);
    night?.setAttribute("content", color);
  }
}
