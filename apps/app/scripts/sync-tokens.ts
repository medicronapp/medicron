// Gera src/global.css e src/theme/colors.generated.ts a partir do globals.css do site (fonte única das cores).
// Só usa tipos apagáveis: roda direto no Node (>= 22.18) e também no Jest.

export type Palette = Record<string, string>;
export type Colors = { light: Palette; dark: Palette };

/** Cores usadas por ícones e SVG (que não herdam className): chave do app → token do site. */
const ICON_TOKENS: Record<string, string> = {
  background: "background",
  foreground: "foreground",
  muted: "muted-foreground",
  primary: "primary",
  primaryForeground: "primary-foreground",
  destructive: "destructive",
  brandInk: "brand-ink",
  successInk: "success-ink",
  warningInk: "warning-ink",
  destructiveInk: "destructive-ink",
  infoInk: "info-ink",
  heroAccent: "hero-accent",
  heroFrom: "hero-from",
  heroTo: "hero-to",
  heroCore: "hero-core",
  successForeground: "success-foreground",
  warningForeground: "warning-foreground",
};

const OKLCH = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/;

/** oklch -> #rrggbb (Björn Ottosson). */
export function oklchToHex(L: number, C: number, H: number): string {
  const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const enc = (v: number) => {
    const c = Math.min(1, Math.max(0, v));
    return Math.round((c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255);
  };
  return "#" + lin.map((v) => enc(v).toString(16).padStart(2, "0")).join("");
}

function block(src: string, selector: string): string {
  const i = src.indexOf(`${selector} {`);
  if (i < 0) throw new Error(`bloco "${selector}" não encontrado no globals.css`);
  return src.slice(i + selector.length + 3, src.indexOf("\n}", i));
}

function declarations(body: string): [string, string][] {
  return [...body.matchAll(/^\s*(--[\w-]+):\s*(.+?);\s*$/gm)].map((m) => [m[1], m[2]]);
}

function oklchParts(value: string, what: string): [string, string, string] {
  const m = value.match(OKLCH);
  if (!m) throw new Error(`${what}: esperava oklch(...), veio "${value}"`);
  return [m[1], m[2], m[3]];
}

/** Variáveis de um tema mais os tokens de alfa explícitos (o modificador /NN não resolve cores de variável no nativo). */
function themeVars(entries: [string, string][]): [string, string][] {
  const get = (name: string) => entries.find(([k]) => k === name)?.[1] ?? "";
  const [bl, bc, bh] = oklchParts(get("--brand"), "--brand");
  const [ml, mc, mh] = oklchParts(get("--muted-foreground"), "--muted-foreground");
  return [
    ...entries,
    ["--brand-20", `oklch(${bl} ${bc} ${bh} / 0.2)`],
    ["--brand-40", `oklch(${bl} ${bc} ${bh} / 0.4)`],
    ["--dot-off", `oklch(${ml} ${mc} ${mh} / 0.3)`],
  ];
}

const lines = (entries: [string, string][], indent: string) => entries.map(([k, v]) => `${indent}${k}: ${v};`).join("\n");

export function buildTokens(sourceCss: string): { css: string; colors: Colors } {
  const light = declarations(block(sourceCss, ":root"));
  const dark = declarations(block(sourceCss, ".dark"));
  const theme = block(sourceCss, "@theme inline")
    .split("\n")
    .filter((l) => /^\s*--(color|radius)-/.test(l))
    .map((l) => `  ${l.trim()}`);

  const css = `/* Gerado por scripts/sync-tokens.ts a partir de apps/api/src/app/globals.css. Não edite à mão. */
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css";

@import "nativewind/theme";

:root {
${lines(themeVars(light), "  ")}
}

@media (prefers-color-scheme: dark) {
  :root {
${lines(themeVars(dark), "    ")}
  }
}

@theme inline {
${theme.join("\n")}
  --color-brand-20: var(--brand-20);
  --color-brand-40: var(--brand-40);
  --color-dot-off: var(--dot-off);
}
`;

  const palette = (entries: [string, string][]): Palette => {
    const out: Palette = {};
    for (const [key, token] of Object.entries(ICON_TOKENS)) {
      const value = entries.find(([k]) => k === `--${token}`)?.[1];
      if (!value) throw new Error(`token --${token} ausente`);
      const [l, c, h] = oklchParts(value, `--${token}`);
      out[key] = oklchToHex(Number(l), Number(c), Number(h));
    }
    return out;
  };
  const sorted = (p: Palette): Palette => Object.fromEntries(Object.entries(p).sort(([a], [b]) => a.localeCompare(b)));
  return { css, colors: { light: sorted(palette(light)), dark: sorted(palette(dark)) } };
}

export function colorsModule(colors: Colors): string {
  return `// Gerado por scripts/sync-tokens.ts a partir do globals.css do site. Não edite à mão.
export const LIGHT = ${JSON.stringify(colors.light, null, 2)} as const;

export const DARK = ${JSON.stringify(colors.dark, null, 2)} as const;

export const COLORS = { light: LIGHT, dark: DARK } as const;

export type ThemeColors = { [K in keyof typeof LIGHT]: string };
`;
}
