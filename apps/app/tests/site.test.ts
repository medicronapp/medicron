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
      "Lembretes de remédio para quem cuida de gente e de bicho.",
      "O Medicron avisa na hora de cada dose e mostra para a família inteira o que já foi dado, para ninguém esquecer nem repetir.",
      "Criar conta", "Já tenho conta →", "Em poucas palavras", "A tela Hoje: o que falta e o que atrasou.",
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

describe("exemplo da tela do app", () => {
  const h = html();
  test("Família Souza, Pedro, Ana e Mel, e nenhuma Vovó", () => {
    for (const t of ["Família Souza", "3 de 5", "Vitamina D", "Pedro", "Losartana", "Ana", "Vermífugo", "Mel", "Atrasada", "Agora", "Feita"]) expect(h).toContain(t);
    expect(h).not.toMatch(/Vov[óo]/);
  });
  test("é uma imagem para leitores de tela (rótulo), com o conteúdo interno escondido", () => {
    expect(h).toMatch(/role="img"\s+aria-label="[^"]*tela Hoje[^"]*"/);
    expect(h).toMatch(/aria-hidden="true"/);
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
  test("só as variáveis que a página usa", () => {
    expect(css).not.toContain("--chart-1");
    expect(css).not.toContain("--sidebar");
  });
});

describe("sem terceiros e sem decoração", () => {
  const h = html();
  test("nenhuma requisição a outro domínio", () => {
    expect(h).not.toMatch(/<script[^>]+src=/);
    expect(h).not.toMatch(/<link(?![^>]*rel="canonical")[^>]+href="https?:/);
    expect(h).not.toMatch(/@import|url\(["']?https?:/);
    expect(h).not.toMatch(/https?:\/\/(?!medicron\.com\.br)/);
  });
  test("CSS sem degradê, sombra pesada nem animação", () => {
    const style = h.slice(h.indexOf("<style>"), h.indexOf("</style>"));
    expect(style).not.toMatch(/gradient|animation|@keyframes|transition|backdrop-filter/);
  });
});

describe("buildSite", () => {
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
