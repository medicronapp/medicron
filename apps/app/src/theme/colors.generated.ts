// Gerado por scripts/sync-tokens.ts a partir do globals.css do site. Não edite à mão.
export const LIGHT = {
  "brandInk": "#00423f",
  "destructive": "#d01d21",
  "destructiveInk": "#94020d",
  "foreground": "#101a1b",
  "heroAccent": "#6febcc",
  "infoInk": "#00437f",
  "muted": "#5a6667",
  "primary": "#006d69",
  "primaryForeground": "#f8fdfc",
  "successInk": "#0d4a22",
  "warningInk": "#663d00"
} as const;

export const DARK = {
  "brandInk": "#a1e7e2",
  "destructive": "#ff6367",
  "destructiveInk": "#ffb7b3",
  "foreground": "#f3f2ee",
  "heroAccent": "#6febcc",
  "infoInk": "#b1ddff",
  "muted": "#9ca7a7",
  "primary": "#006763",
  "primaryForeground": "#f8fdfc",
  "successInk": "#a8ebb5",
  "warningInk": "#fdd990"
} as const;

export const COLORS = { light: LIGHT, dark: DARK } as const;

export type ThemeColors = { [K in keyof typeof LIGHT]: string };
