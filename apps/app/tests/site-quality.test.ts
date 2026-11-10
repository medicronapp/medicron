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
  test("hierarquia: h1, depois h2; figura sem legenda; viewport definido", () => {
    expect(body.indexOf("<h1")).toBeLessThan(body.indexOf("<h2"));
    expect(body).toMatch(/<figure[\s\S]*<\/figure>/);
    expect(body).not.toMatch(/figcaption/);
    expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">');
  });
});

describe("alvos de toque (≥ 44 px)", () => {
  const minHeight = (selector: string) => {
    const m = style.match(new RegExp(`(?:^|[}\\s,])${selector.replace(/[.]/g, "\\.")}\\{[^}]*min-height:(\\d+)px`));
    return m ? Number(m[1]) : 0;
  };
  test.each([".btn", ".lnk", ".enter", ".mark", ".links a"])("%s", (sel) => {
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
  const PAIRS: [string, string][] = [["foreground", "background"], ["muted-foreground", "background"], ["primary-foreground", "primary"]];
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
  type Env = { stored?: string | null; blocked?: boolean; standalone?: boolean; navStandalone?: boolean; matchMediaThrows?: boolean };
  const exec = ({ stored = null, blocked = false, standalone = false, navStandalone = false, matchMediaThrows = false }: Env) => {
    const attrs: Record<string, string> = {};
    const replaced: string[] = [];
    new Function("localStorage", "document", "matchMedia", "navigator", "location", js)(
      { getItem: () => { if (blocked) throw new Error("bloqueado"); return stored; } },
      { documentElement: { setAttribute: (k: string, v: string) => { attrs[k] = v; } } },
      () => { if (matchMediaThrows) throw new Error("sem matchMedia"); return { matches: standalone }; },
      { standalone: navStandalone },
      { replace: (u: string) => replaced.push(u) },
    );
    return { attrs, replaced };
  };
  test("app instalado (PWA) com sessão expirada vai para a tela de entrada do app, não para o hotsite", () => {
    expect(exec({ standalone: true }).replaced).toEqual(["/?source=pwa"]);
    expect(exec({ navStandalone: true }).replaced).toEqual(["/?source=pwa"]); // iOS antigo
    expect(exec({}).replaced).toEqual([]); // navegador comum: fica no hotsite
  });
  test("sem matchMedia ou com storage bloqueado, a página segue normal (e o tema ainda é aplicado)", () => {
    expect(exec({ matchMediaThrows: true }).replaced).toEqual([]);
    expect(exec({ stored: "dark", blocked: false, matchMediaThrows: true }).attrs).toEqual({ "data-theme": "dark" });
  });
  test("executado de verdade: escolha escura vira data-theme; valor estranho e storage bloqueado são ignorados", () => {
    const run = (stored: string | null, blocked = false) => exec({ stored, blocked }).attrs;
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
  test("no máximo 2 arquivos de fonte; imagens só as 4 capturas do app (duas telas, uma por tema), sem fundo em imagem", () => {
    expect(style.match(/url\(\/landing\/fonts\//g)).toHaveLength(2);
    expect(body.match(/<img /g)).toHaveLength(4);
    expect(body).not.toMatch(/<picture|background-image/);
    expect(style).not.toMatch(/background-image/);
  });
  test("só a captura do tema em uso aparece (e só ela é baixada): a outra fica display:none, nos dois mecanismos de tema", () => {
    expect(style).toMatch(/\.hero-shot \.shot-d\{display:none\}/);
    expect(style).toMatch(/@media \(prefers-color-scheme:dark\)\{:root:not\(\[data-theme="light"\]\) \.hero-shot \.shot-l\{display:none\}:root:not\(\[data-theme="light"\]\) \.hero-shot \.shot-d\{display:block\}\}/);
    expect(style).toMatch(/:root\[data-theme="dark"\] \.hero-shot \.shot-l\{display:none\}:root\[data-theme="dark"\] \.hero-shot \.shot-d\{display:block\}/);
  });
  test("a regra que esconde a captura vence a que mostra imagens (especificidade): senão as duas aparecem empilhadas", () => {
    // `.hero-shot img{display:block}` tem especificidade (0,1,1); esconder precisa de (0,2,0) ou mais.
    const spec = (sel: string) => ({ ids: 0, cls: (sel.match(/[.[:]/g) ?? []).length, tags: (sel.match(/(^|[ >])[a-z]+/g) ?? []).length });
    const hide = spec(".hero-shot .shot-d");
    const show = spec(".hero-shot img");
    expect(hide.cls).toBeGreaterThan(show.cls);
  });

  test("na moldura do cartão 'Em família' só a captura do tema em uso aparece, e a regra que esconde vence a que mostra", () => {
    expect(style).toMatch(/\.phone \.fam-d\{display:none\}/);
    expect(style).toMatch(/@media \(prefers-color-scheme:dark\)\{[^@]*:root:not\(\[data-theme="light"\]\) \.phone \.fam-l\{display:none\}:root:not\(\[data-theme="light"\]\) \.phone \.fam-d\{display:block\}/);
    expect(style).toMatch(/:root\[data-theme="dark"\] \.phone \.fam-l\{display:none\}:root\[data-theme="dark"\] \.phone \.fam-d\{display:block\}/);
  });
  test("a ilustração é quadrada e recortada, com moldura de celular (borda grossa escura, ilha de câmera) e sem sombra extra", () => {
    expect(style).toMatch(/\.fam-art\{[^}]*aspect-ratio:1\s*\/\s*1[^}]*overflow:hidden/);
    const phone = style.match(/\.phone\{[^}]*\}/)![0];
    expect(phone).toMatch(/border:\d+px solid/);
    expect(phone).toMatch(/border-radius:\d+px \d+px 0 0/);
    expect(style).toMatch(/\.phone::before\{[^}]*border-radius:999px/);
  });
  test("a ilustração é um quadrado 1:1 de cantos arredondados com fundo colorido próprio (var(--art)), diferente do cartão", () => {
    const art = style.match(/\.fam-art\{[^}]*\}/)![0];
    expect(art).toMatch(/aspect-ratio:1\s*\/\s*1/);
    expect(art).toMatch(/border-radius:\d+px/);
    expect(art).toMatch(/background:var\(--art\)/);
    expect(style.match(/--art:/g)!.length).toBe(3); // claro, escuro (automático) e escuro (escolhido)
    expect(style).toMatch(/\.row-fam\{[^}]*background:var\(--tint\)/);
  });
  test("a fonte troca por fallback sem bloquear (font-display: swap) e há preload da principal", () => {
    expect(style.match(/font-display:swap/g)).toHaveLength(2);
    expect(html).toMatch(/<link rel="preload" href="\/landing\/fonts\/geist-400.woff2" as="font" type="font\/woff2" crossorigin>/);
  });
  test("sem animação nem transição; degradê só em variáveis de tema (--grad do hero e --art da ilustração) e sombra só na captura", () => {
    expect(style).not.toMatch(/animation|transition|@keyframes|filter/);
    const semVariaveis = style.replace(/--(?:grad|art):[^;}]*/g, "");
    expect(semVariaveis).not.toMatch(/gradient/);
    expect(style.match(/box-shadow/g)).toHaveLength(3); // claro, escuro (automático) e escuro (escolhido), todas em .hero-shot img
  });
  test("hero é uma caixa arredondada, com respiro antes de \"Em poucas palavras\"", () => {
    const hero = style.match(/\.hero\{[^}]*\}/)![0];
    expect(Number(hero.match(/border-radius:(\d+)px/)![1])).toBeGreaterThanOrEqual(24);
    expect(Number(hero.match(/margin:\d+px 0 (\d+)px/)![1])).toBeGreaterThanOrEqual(64);
    expect(hero).toMatch(/overflow:hidden/);
  });
  test("o destaque atrás da captura não invade o texto: círculos menores que a coluna + folga, e o texto fica por cima", () => {
    const gap = 64;
    const widths = [...style.matchAll(/\.hero-shot::(?:before|after)\{[^}]*width:(\d+)px/g)].map((m) => Number(m[1]));
    expect(widths).toHaveLength(4); // 2 círculos no computador, 2 no celular
    for (const w of widths) expect(w).toBeLessThanOrEqual(340 + 2 * (gap - 8));
    expect(style).toMatch(/\.hero-text\{[^}]*position:relative[^}]*z-index:2/);
  });
  test("sombra grande e esfumaçada abaixo da captura (deslocada para baixo, blur largo)", () => {
    const m = style.match(/\.hero-shot img\{[^}]*box-shadow:0 (\d+)px (\d+)px/)!;
    expect(Number(m[1])).toBeGreaterThanOrEqual(30);
    expect(Number(m[2])).toBeGreaterThanOrEqual(50);
  });
  test("só um elemento sólido de ação (uma cor de ação); vermelho e verde de estado só existem dentro da captura do app", () => {
    expect(body.match(/class="btn"/g)).toHaveLength(1);
    expect(style).not.toMatch(/--destructive|--success/);
  });
  test("largura: página larga (até 1160 px), hero em duas colunas no computador e em uma só no celular", () => {
    expect(style).toMatch(/\.top,main,\.foot\{max-width:1160px;margin:0 auto/);
    expect(style).toMatch(/\.hero\{display:grid;grid-template-columns:minmax\(0,1fr\) 340px/);
    expect(style).toMatch(/@media \(max-width:860px\)\{[^@]*\.hero\{grid-template-columns:1fr/);
    expect(style).not.toMatch(/body\{[^}]*max-width:640px/);
  });
  test("a captura nunca estoura a coluna (largura máxima 100% e altura automática)", () => {
    expect(style).toMatch(/\.hero-shot img\{[^}]*max-width:100%[^}]*height:auto/);
  });
  test("no HTML, o texto vem antes da captura (leitores de tela e telas pequenas leem o título primeiro)", () => {
    expect(body.indexOf("<h1")).toBeLessThan(body.indexOf("<img"));
  });
});
