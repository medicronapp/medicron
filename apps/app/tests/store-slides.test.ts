import { renderStoreSlide, STORE_SIZES, STORE_SLIDES } from "../scripts/store-slides";

const PIXEL = "data:image/png;base64,iVBORw0KGgo=";

describe("imagens da App Store: tamanhos e roteiro", () => {
  test("tamanhos exigidos pela Apple para iPhone: 6,9\" (1320×2868) e 6,5\" (1284×2778)", () => {
    expect(STORE_SIZES).toEqual([
      { id: "6.9", width: 1320, height: 2868 },
      { id: "6.5", width: 1284, height: 2778 },
    ]);
  });
  test("5 telas na ordem de docs/lojas.md: Hoje, Pacientes, Rotina, Itens, Conta", () => {
    expect(STORE_SLIDES.map((s) => s.id)).toEqual(["hoje", "pacientes", "rotina", "itens", "conta"]);
    expect(STORE_SLIDES.map((s) => s.route)).toEqual(["/", "/pacientes", "/pacientes/pa_ana", "/itens", "/conta"]);
  });
  test("textos curtos, em português e sem promessa médica nem superlativo", () => {
    for (const s of STORE_SLIDES) {
      expect(s.title.length).toBeGreaterThan(8);
      expect(s.title.length).toBeLessThanOrEqual(42);
      expect(s.subtitle.length).toBeLessThanOrEqual(70);
      expect(`${s.title} ${s.subtitle}`).not.toMatch(/\b(cura|curar|trata|tratamento|diagn[óo]stic|dose certa|melhor|n[ºo]\s?1|garant|sempre|nunca)\w*/i);
    }
  });
});

describe("renderStoreSlide", () => {
  const slide = STORE_SLIDES[0];
  const size = STORE_SIZES[0];
  const html = renderStoreSlide(slide, size, PIXEL, "@font-face{font-family:Geist}");
  test("página do tamanho exato, em pt-BR, com título, subtítulo e a captura embutida", () => {
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain("width:1320px;height:2868px");
    expect(html).toContain(slide.title);
    expect(html).toContain(slide.subtitle);
    expect(html).toContain(`<img src="${PIXEL}"`);
  });
  test("não carrega nada de fora (sem http) e usa a fonte recebida", () => {
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).toContain("@font-face{font-family:Geist}");
  });
  test("escapa HTML no título (nada de marcação injetada)", () => {
    const h = renderStoreSlide({ ...slide, title: "A <b>&</b> B" }, size, PIXEL, "");
    expect(h).toContain("A &lt;b&gt;&amp;&lt;/b&gt; B");
  });
  test("o celular sangra pela base (recortado), como no site", () => {
    expect(html).toMatch(/\.phone\{[^}]*border-bottom:0/);
    expect(html).toMatch(/body\{[^}]*overflow:hidden/);
  });
  test("a escala acompanha a largura (6,5\" gera medidas proporcionais, não as do 6,9\")", () => {
    const small = renderStoreSlide(slide, STORE_SIZES[1], PIXEL, "");
    expect(small).toContain("width:1284px;height:2778px");
    expect(small).not.toContain("width:1320px");
  });
});
