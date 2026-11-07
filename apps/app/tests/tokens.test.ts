import { readFileSync } from "node:fs";
import path from "node:path";
import { buildTokens, oklchToHex } from "../scripts/sync-tokens";

const root = path.resolve(__dirname, "..");
const site = readFileSync(path.resolve(root, "../api/src/app/globals.css"), "utf8");
const read = (p: string) => readFileSync(path.resolve(root, p), "utf8");

describe("buildTokens", () => {
  const { css, colors } = buildTokens(site);
  const lightBlock = css.slice(css.indexOf(":root {"), css.indexOf("@media (prefers-color-scheme: dark)"));
  const darkBlock = css.slice(css.indexOf("@media (prefers-color-scheme: dark)"), css.indexOf("@theme inline"));

  test("tema claro e escuro vêm dos mesmos valores do site", () => {
    expect(lightBlock).toContain("--primary: oklch(0.48 0.09 190)");
    expect(darkBlock).toContain("--primary: oklch(0.46 0.09 190)");
    expect(darkBlock).toContain("--background: oklch(0.18 0.012 200)");
  });

  test("tokens de alfa explícitos (o /20 não funciona no nativo) nos dois temas", () => {
    expect(css).toContain("--color-brand-20: var(--brand-20)");
    expect(css).toContain("--color-dot-off: var(--dot-off)");
    expect(lightBlock).toMatch(/--brand-20: oklch\(0\.51 0\.09 190 \/ 0\.2\)/);
    expect(darkBlock).toMatch(/--brand-20: oklch\(0\.76 0\.11 190 \/ 0\.2\)/);
  });

  test("mapeia as cores para o Tailwind", () => {
    expect(css).toContain("--color-primary: var(--primary)");
    expect(css).toContain("--color-hero-from: var(--hero-from)");
  });

  test("hex das cores usadas por ícones e SVG, nos dois temas", () => {
    expect(Object.keys(colors.light).sort()).toEqual(
      ["brandInk", "destructiveInk", "foreground", "heroAccent", "infoInk", "muted", "primary", "primaryForeground", "successInk", "warningInk"],
    );
    for (const v of [...Object.values(colors.light), ...Object.values(colors.dark)]) expect(v).toMatch(/^#[0-9a-f]{6}$/);
    expect(colors.light.primary).not.toBe(colors.dark.primary);
  });
});

describe("oklchToHex", () => {
  test("extremos", () => {
    expect(oklchToHex(1, 0, 0)).toBe("#ffffff");
    expect(oklchToHex(0, 0, 0)).toBe("#000000");
  });
});

describe("arquivos gerados estão em dia com o site", () => {
  const { css, colors } = buildTokens(site);
  test("src/global.css", () => expect(read("src/global.css")).toBe(css));
  test("src/theme/colors.generated.ts", () => {
    expect(read("src/theme/colors.generated.ts")).toContain(JSON.stringify(colors.light, null, 2));
    expect(read("src/theme/colors.generated.ts")).toContain(JSON.stringify(colors.dark, null, 2));
  });
});

describe("contraste AA (≥ 4,5) do que vai gerado", () => {
  const css = read("src/global.css");
  const blocks = {
    claro: css.slice(css.indexOf(":root {"), css.indexOf("@media (prefers-color-scheme: dark)")),
    escuro: css.slice(css.indexOf("@media (prefers-color-scheme: dark)"), css.indexOf("@theme inline")),
  };
  const token = (b: string, name: string): [number, number, number] => {
    const m = b.match(new RegExp(`--${name}:\\s*oklch\\(([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)`));
    if (!m) throw new Error(`token --${name} ausente`);
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  };
  const lum = ([L, C, H]: [number, number, number]) => {
    const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const c = (v: number) => Math.min(1, Math.max(0, v));
    return 0.2126 * c(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) + 0.7152 * c(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) + 0.0722 * c(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  };
  const ratio = (x: [number, number, number], y: [number, number, number]) => { const [hi, lo] = [lum(x), lum(y)].sort((p, q) => q - p); return (hi + 0.05) / (lo + 0.05); };
  const WHITE: [number, number, number] = [1, 0, 0];

  test.each(["claro", "escuro"] as const)("tema %s", (tema) => {
    const b = blocks[tema];
    expect(ratio(token(b, "primary"), token(b, "primary-foreground"))).toBeGreaterThanOrEqual(4.5);
    for (const t of ["hero-from", "hero-to", "hero-core"]) expect(ratio(token(b, t), WHITE)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(token(b, "link"), token(b, "background"))).toBeGreaterThanOrEqual(4.5);
  });
});
