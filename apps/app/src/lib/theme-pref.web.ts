export type ThemePref = "light" | "dark" | "system";

// Na web o tema escuro vem do navegador (`prefers-color-scheme`): não há preferência manual até a Etapa 6.
export async function loadThemePref(): Promise<ThemePref> {
  return "system";
}
export async function saveThemePref(_pref: ThemePref): Promise<void> {}
export function applyThemePref(_pref: ThemePref): void {}
