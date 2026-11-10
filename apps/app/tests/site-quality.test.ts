import fs from "node:fs";
import path from "node:path";
import { extractTokens, loadSources, renderSite } from "../scripts/build-site";

const appRoot = path.resolve(__dirname, "..");
const src = loadSources(appRoot);
const html = renderSite({}, src);
const style = html.slice(html.indexOf("<style>") + 7, html.indexOf("</style>"));
const body = html.slice(html.indexOf("<body>"));

describe("estrutura e navegação por teclado", () => {
  test("marcos header, main e footer, e uma única main", () => {
    expect(body).toContain("<header");
    expect(body.match(/<main[ >]/g)).toHaveLength(1);
    expect(body).toContain("<footer");
  });
  test("'Pular para o conteúdo' é o primeiro link e leva à main", () => {
    const first = body.match(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)</)!;
    expect(first[1]).toBe("#conteudo");
    expect(first[2]).toBe("Pular para o conteúdo");
    expect(body).toMatch(/<main id="conteudo">/);
  });
  test("foco visível de 2 px em links e botões", () => {
    expect(style).toMatch(/a:focus-visible\{[^}]*outline:2px solid/);
  });
  test("hierarquia: h1, depois h2; figura com legenda; viewport definido", () => {
    expect(body.indexOf("<h1")).toBeLessThan(body.indexOf("<h2"));
    expect(body).toMatch(/<figure[\s\S]*<figcaption>[\s\S]*<\/figcaption>[\s\S]*<\/figure>/);
    expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">');
  });
});

describe("alvos de toque (≥ 44 px)", () => {
  const minHeight = (selector: string) => {
    const m = style.match(new RegExp(`(?:^|[}\\s,])${selector.replace(/[.]/g, "\\.")}\\{[^}]*min-height:(\\d+)px`));
    return m ? Number(m[1]) : 0;
  };
  test.each([".btn", ".lnk", ".mark", ".links a"])("%s", (sel) => {
    expect(minHeight(sel)).toBeGreaterThanOrEqual(44);
  });
});

// Conversão oklch → luminância (a mesma do teste de tokens do app).
const lum = ([L, C, H]: number[]) => {
  const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const c = (v: number) => Math.min(1, Math.max(0, v));
  return 0.2126 * c(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) + 0.7152 * c(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) + 0.0722 * c(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
};
const ratio = (x: number[], y: number[]) => { const [hi, lo] = [lum(x), lum(y)].sort((p, q) => q - p); return (hi + 0.05) / (lo + 0.05); };

describe("contraste AA (≥ 4,5) dos pares de cor usados, claro e escuro", () => {
  const css = extractTokens(fs.readFileSync(path.join(appRoot, "src/global.css"), "utf8"));
  const light = css.slice(css.indexOf(":root{") + 6, css.indexOf("}@media"));
  const dark = css.slice(css.indexOf(':root[data-theme="dark"]{') + 25, css.lastIndexOf("}"));
  const token = (block: string, name: string): number[] => {
    const m = block.match(new RegExp(`--${name}:oklch\\(([\\d.]+) ([\\d.]+) ([\\d.]+)`));
    if (!m) throw new Error(`token ${name} ausente`);
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  };
  const PAIRS: [string, string][] = [
    ["foreground", "background"], ["muted-foreground", "background"], ["muted-foreground", "card"], ["primary-foreground", "primary"],
    ["brand-ink", "brand-soft"], ["destructive-ink", "destructive-soft"], ["success-ink", "success-soft"], ["foreground", "card"],
  ];
  test.each(["claro", "escuro"])("%s", (tema) => {
    const b = tema === "claro" ? light : dark;
    const fail = PAIRS.filter(([fg, bg]) => ratio(token(b, fg), token(b, bg)) < 4.5).map(([fg, bg]) => `${fg} sobre ${bg}`);
    expect(fail).toEqual([]);
  });
});

describe("tema (trecho de JavaScript)", () => {
  const js = src.themeJs.trim();
  test("≤ 600 bytes, em try/catch, só aceita light e dark da mesma chave do app", () => {
    expect(Buffer.byteLength(js)).toBeLessThanOrEqual(600);
    expect(js).toMatch(/^try\{[\s\S]*\}catch\(e\)\{\}$/);
    expect(js).toContain('localStorage.getItem("medicron.theme")');
    expect(js).toMatch(/t==="light"\|\|t==="dark"/);
  });
  test("aplica data-theme no <html> antes de a página pintar (script no head, sem defer)", () => {
    const head = html.slice(0, html.indexOf("</head>"));
    expect(head).toMatch(/<script>try\{/);
    expect(js).toContain('setAttribute("data-theme"');
  });
  test("executado de verdade: escolha escura vira data-theme; valor estranho e storage bloqueado são ignorados", () => {
    const run = (stored: string | null, blocked = false) => {
      const attrs: Record<string, string> = {};
      const g = {
        localStorage: { getItem: () => { if (blocked) throw new Error("bloqueado"); return stored; } },
        document: { documentElement: { setAttribute: (k: string, v: string) => { attrs[k] = v; } } },
      };
      new Function("localStorage", "document", js)(g.localStorage, g.document);
      return attrs;
    };
    expect(run("dark")).toEqual({ "data-theme": "dark" });
    expect(run("light")).toEqual({ "data-theme": "light" });
    expect(run("roxo")).toEqual({});
    expect(run(null)).toEqual({});
    expect(run("dark", true)).toEqual({});
  });
});

describe("leve e sem enfeite", () => {
  test("HTML com CSS embutido ≤ 25 KB", () => {
    expect(Buffer.byteLength(html)).toBeLessThanOrEqual(25 * 1024);
  });
  test("no máximo 2 arquivos de fonte e nenhuma imagem raster no corpo", () => {
    expect(style.match(/url\(\/landing\/fonts\//g)).toHaveLength(2);
    expect(body).not.toMatch(/<img|<picture|background-image/);
  });
  test("a fonte troca por fallback sem bloquear (font-display: swap) e há preload da principal", () => {
    expect(style.match(/font-display:swap/g)).toHaveLength(2);
    expect(html).toMatch(/<link rel="preload" href="\/landing\/fonts\/geist-400.woff2" as="font" type="font\/woff2" crossorigin>/);
  });
  test("sem animação, transição, sombra, filtro nem degradê", () => {
    expect(style).not.toMatch(/animation|transition|@keyframes|box-shadow|filter|gradient/);
  });
  test("só um elemento sólido de ação (uma cor de ação) e o vermelho só no 'Atrasada'", () => {
    expect(body.match(/class="btn"/g)).toHaveLength(1);
    expect(style.match(/var\(--destructive-/g)).toHaveLength(2);
  });
  test("apps do tamanho do celular: sem rolagem horizontal (nada com largura fixa maior que a coluna)", () => {
    expect(style).toMatch(/body\{[^}]*max-width:640px/);
    expect(style).toMatch(/\.shot\{[^}]*width:300px;max-width:100%/);
  });
});
