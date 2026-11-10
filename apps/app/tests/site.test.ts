import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildSite, extractTokens, loadSources, renderSite, type SiteEnv } from "../scripts/build-site";

const appRoot = path.resolve(__dirname, "..");
const src = loadSources(appRoot);
const html = (env: SiteEnv = {}) => renderSite(env, src);
const links = (h: string) => [...h.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ href: m[1], text: m[2].replace(/<[^>]+>/g, "").trim() }));

describe("conteúdo (texto exato da spec)", () => {
  const h = html();
  test("título, texto e rótulos", () => {
    for (const t of [
      "Lembretes de remédio para quem cuida de gente e de pets.",
      "O Medicron avisa na hora de cada dose e mostra para a família inteira o que já foi dado, para ninguém esquecer nem repetir.",
      "Criar conta", "Já tenho conta →", "Em poucas palavras",
      "O Medicron é um organizador de lembretes. Não faz diagnóstico nem indica doses ou tratamentos: siga a orientação do seu médico ou veterinário.",
    ]) expect(h).toContain(t);
  });
  test("exatamente um h1", () => {
    expect(h.match(/<h1[ >]/g)).toHaveLength(1);
  });
  test("a lista de definições tem os cinco termos", () => {
    for (const t of ["Lembretes", "Gente e pets", "Em família", "No iPhone", "Seus dados"]) expect(h).toMatch(new RegExp(`<dt>${t}</dt>`));
  });
});

describe("links", () => {
  const l = links(html());
  test("topo e ação levam a entrar e a criar conta", () => {
    expect(l.find((x) => x.text === "Entrar")!.href).toBe("/entrar");
    expect(l.find((x) => x.text === "Criar conta")!.href).toBe("/cadastrar");
    expect(l.find((x) => x.text === "Já tenho conta →")!.href).toBe("/entrar");
    expect(l.find((x) => x.text === "Política de privacidade")!.href).toBe("/privacidade");
  });
  test("só links internos, âncora ou mailto (sem terceiros)", () => {
    for (const x of l) expect(x.href).toMatch(/^(\/|#|mailto:)/);
  });
  test("o botão 'Criar conta' é o único elemento sólido de ação", () => {
    expect(html().match(/class="btn"/g)).toHaveLength(1);
  });
});

describe("a tela do app é a captura REAL (não um desenho em HTML)", () => {
  const h = html();
  test("quatro imagens (Hoje e Conta, cada uma em claro e escuro), com tamanho declarado, texto alternativo e carregamento preguiçoso", () => {
    const imgs = [...h.matchAll(/<img [^>]*>/g)].map((m) => m[0]);
    expect(imgs).toHaveLength(4);
    expect(imgs[0]).toContain('src="/landing/hoje-claro.webp"');
    expect(imgs[1]).toContain('src="/landing/hoje-escuro.webp"');
    expect(imgs[2]).toContain('src="/landing/familia-claro.webp"');
    expect(imgs[3]).toContain('src="/landing/familia-escuro.webp"');
    for (const i of imgs) {
      expect(i).toContain('width="390"');
      expect(i).toContain('height="760"');
      expect(i).toContain('loading="lazy"');
      expect(i).toContain('decoding="async"');
      expect(i).toMatch(/alt="[^"]{40,}"/);
    }
  });
  test("o texto alternativo descreve a tela e usa os nomes do exemplo (sem Vovó)", () => {
    const alt = h.match(/<img [^>]*alt="([^"]+)"/)![1];
    for (const t of ["Hoje", "3 de 5", "Pedro", "Vitamina D", "Ana", "Losartana"]) expect(alt).toContain(t);
    expect(h).not.toMatch(/Vov[óo]/);
  });
  test("o cartão 'Em família' mostra a tela Conta real dentro de uma moldura de celular, antes do texto", () => {
    const row = h.match(/<div class="row row-fam">[\s\S]*?<\/dd><\/div>/)![0];
    expect(row.indexOf('class="phone"')).toBeGreaterThan(-1);
    expect(row.indexOf('class="phone"')).toBeLessThan(row.indexOf("<dt>"));
    const alts = [...row.matchAll(/alt="([^"]+)"/g)].map((m) => m[1]);
    expect(alts).toHaveLength(2);
    for (const a of alts) for (const t of ["Conta", "Família Souza", "Ana Souza", "Pedro Souza", "Carla Souza", "Convidar alguém"]) expect(a).toContain(t);
  });
  test("o desenho em HTML da tela saiu (a fidelidade vem da captura)", () => {
    expect(h).not.toContain('class="shot"');
    expect(h).not.toContain("Família Souza</span>");
  });
  test("a figura não tem legenda", () => {
    expect(h).not.toContain("A tela Hoje do app");
  });
});

describe("disponibilidade: só afirma o que existe", () => {
  test("sem URLs das lojas: navegador agora, apps em breve, nenhum link de loja", () => {
    const h = html();
    expect(h).toContain("Grátis, sem anúncios. Funciona no navegador; aplicativos para iPhone e Android em breve.");
    expect(h).not.toMatch(/App Store|Google Play/);
  });
  test("com as URLs: a linha muda e aparecem os links", () => {
    const h = html({ appStoreUrl: "https://apps.apple.com/app/id1", playUrl: "https://play.google.com/store/apps/details?id=app.medicron" });
    expect(h).toContain("Grátis, sem anúncios. No iPhone, no Android e no navegador.");
    expect(links(h).filter((x) => /^https:\/\//.test(x.href)).map((x) => x.text)).toEqual(["App Store", "Google Play"]);
  });
  test("só com a URL da App Store: não menciona Android como disponível", () => {
    const h = html({ appStoreUrl: "https://apps.apple.com/app/id1" });
    expect(h).toContain("Grátis, sem anúncios. No iPhone e no navegador; Android em breve.");
    expect(h).not.toContain("Google Play");
  });
});

describe("a linha 'No iPhone' não afirma o que ainda não existe", () => {
  const iphone = (h: string) => h.match(/<dt>No iPhone<\/dt><dd>([^<]*)<\/dd>/)![1];
  test("sem a URL da App Store: 'em breve', no futuro", () => {
    const t = iphone(html());
    expect(t).toMatch(/^Em breve/);
    expect(t).not.toMatch(/mostram/);
  });
  test("com a URL da App Store: no presente", () => {
    const t = iphone(html({ appStoreUrl: "https://apps.apple.com/app/id1" }));
    expect(t).toContain("widgets na tela inicial e na de bloqueio mostram a próxima dose sem abrir o app");
    expect(t).not.toMatch(/^Em breve/);
  });
});

describe("contato", () => {
  test("só aparece com o e-mail configurado", () => {
    expect(links(html()).some((x) => x.text === "Contato")).toBe(false);
    expect(links(html({ contactEmail: "oi@medicron.com.br" })).find((x) => x.text === "Contato")!.href).toBe("mailto:oi@medicron.com.br");
  });
  test("o e-mail é escapado (nada de HTML injetado por variável de ambiente)", () => {
    const h = html({ contactEmail: 'a"><script>x</script>@b.c' });
    expect(h).not.toContain("<script>x");
  });
});

describe("tokens extraídos do app", () => {
  const globalCss = fs.readFileSync(path.join(appRoot, "src/global.css"), "utf8");
  const css = extractTokens(globalCss);
  test("valores claro e escuro vêm do global.css real", () => {
    expect(css).toContain("--primary:oklch(0.48 0.09 190)");
    expect(css).toContain("--primary:oklch(0.46 0.09 190)");
    expect(css).toContain("--background:oklch(0.985 0.004 95)");
    expect(css).toContain("--background:oklch(0.18 0.012 200)");
  });
  test("três regras de tema: claro, escuro do sistema (a menos que o usuário escolha claro) e escuro escolhido", () => {
    expect(css).toMatch(/^:root\{/);
    expect(css).toContain('@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){');
    expect(css).toContain(':root[data-theme="dark"]{');
  });
  test("só as variáveis que a página usa (cada uma aparece no CSS da página)", () => {
    expect(css).not.toContain("--chart-1");
    expect(css).not.toContain("--sidebar");
    const used = [...css.matchAll(/--([\w-]+):/g)].map((m) => m[1]);
    const rules = fs.readFileSync(path.join(appRoot, "site/site.css"), "utf8") + fs.readFileSync(path.join(appRoot, "site/index.template.html"), "utf8");
    const unused = [...new Set(used)].filter((v) => !rules.includes(`var(--${v})`));
    expect(unused).toEqual([]);
  });
});

describe("sem terceiros e sem decoração", () => {
  // O JSON-LD cita o vocabulário schema.org como identificador (não faz requisição); o resto da página não pode ter nenhum.
  const h = html().replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, "");
  test("nenhuma requisição a outro domínio", () => {
    expect(h).not.toMatch(/<script[^>]+src=/);
    expect(h).not.toMatch(/<link(?![^>]*rel="canonical")[^>]+href="https?:/);
    expect(h).not.toMatch(/@import|url\(["']?https?:/);
    expect(h).not.toMatch(/https?:\/\/(?!medicron\.com\.br)/);
  });
  test("CSS sem animação nem desfoque de fundo", () => {
    const style = h.slice(h.indexOf("<style>"), h.indexOf("</style>"));
    expect(style).not.toMatch(/animation|@keyframes|transition|backdrop-filter/);
  });
});

describe("buildSite", () => {
  test("copia as quatro capturas reais do app (≤ 80 KB cada)", () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "site-shots-"));
    buildSite({}, appRoot, out);
    for (const f of ["hoje-claro.webp", "hoje-escuro.webp", "familia-claro.webp", "familia-escuro.webp"]) {
      const file = path.join(out, "landing", f);
      expect(fs.statSync(file).size).toBeGreaterThan(5000);
      expect(fs.statSync(file).size).toBeLessThanOrEqual(80 * 1024);
      expect(fs.readFileSync(file).subarray(8, 12).toString()).toBe("WEBP");
    }
  });
  test("escreve a página e as duas fontes (≤ 40 KB cada)", () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "site-"));
    buildSite({ contactEmail: "oi@medicron.com.br" }, appRoot, out);
    expect(fs.readFileSync(path.join(out, "landing/index.html"), "utf8")).toContain("<h1");
    for (const f of ["geist-400.woff2", "geist-600.woff2"]) {
      const file = path.join(out, "landing/fonts", f);
      expect(fs.statSync(file).size).toBeGreaterThan(1000);
      expect(fs.statSync(file).size).toBeLessThanOrEqual(40 * 1024);
    }
  });
});

const enter = (css: string) => css.match(/(?:^|\n)\.enter\{[^}]*\}/)![0];

describe("texto e botão do topo", () => {
  const h = renderSite({}, loadSources(path.resolve(__dirname, "..")));
  test("não usa a palavra \"bicho\" em lugar nenhum", () => {
    expect(h.toLowerCase()).not.toContain("bicho");
  });
  test("Entrar é um botão suave no tom do Medicron (sem borda nem ícone), com o mesmo raio do Criar conta", () => {
    expect(h).toMatch(/<a class="enter" href="\/entrar">Entrar<\/a>/);
    const css = h.slice(h.indexOf("<style>"), h.indexOf("</style>"));
    const enter = css.match(/(?:^|\n)\.enter\{[^}]*\}/)![0];
    const btn = css.match(/(?:^|\n)\.btn\{[^}]*\}/)![0];
    expect(enter).toMatch(/border:0/);
    expect(enter).toMatch(/color-mix\(in oklab,var\(--primary\)/);
    expect(enter.match(/border-radius:(\d+px)/)![1]).toBe(btn.match(/border-radius:(\d+px)/)![1]);
  });
  test("no tema escuro o texto do Entrar é a menta clara (legível), nos dois mecanismos de tema", () => {
    const css = h.slice(h.indexOf("<style>"), h.indexOf("</style>"));
    expect(enter(css)).toMatch(/color:var\(--enter\)/);
    expect(css.match(/--enter:#99f6e4/g)).toHaveLength(2); // automático e escolhido
    expect(css).toMatch(/:root\{[^}]*--enter:var\(--primary\)/);
  });
});
