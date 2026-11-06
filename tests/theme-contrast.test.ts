import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");
const block = (sel: string) => css.slice(css.indexOf(`${sel} {`)).split("}")[0];
const token = (b: string, name: string): [number, number, number] => {
  const m = b.match(new RegExp(`--${name}:\\s*oklch\\(([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)`));
  if (!m) throw new Error(`token --${name} ausente`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};

/** Luminância relativa (WCAG) de uma cor OKLCH, via sRGB linear. */
function luminance([L, C, H]: [number, number, number]): number {
  const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const c = (v: number) => Math.min(1, Math.max(0, v));
  const r = c(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = c(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const bl = c(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}
const contrast = (x: [number, number, number], y: [number, number, number]) => {
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
};
const WHITE: [number, number, number] = [1, 0, 0];

describe.each([[":root", "claro"], [".dark", "escuro"]])("tema %s (%s)", (sel) => {
  const b = block(sel);

  test("botão primário: texto claro com contraste AA sobre o verde", () => {
    const fg = token(b, "primary-foreground");
    expect(fg[0]).toBeGreaterThanOrEqual(0.9);
    expect(contrast(token(b, "primary"), fg)).toBeGreaterThanOrEqual(4.5);
    expect(token(b, "sidebar-primary-foreground")[0]).toBeGreaterThanOrEqual(0.9);
  });

  test("painéis verdes (login e sequência): texto branco com contraste AA em todo o degradê", () => {
    for (const t of ["hero-from", "hero-to", "hero-core"]) {
      expect(contrast(token(b, t), WHITE), t).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("links usam uma cor própria legível sobre o fundo", () => {
    expect(contrast(token(b, "link"), token(b, "background"))).toBeGreaterThanOrEqual(4.5);
  });
});
