import { FEATURE_SIZE, renderFeatureGraphic } from "../scripts/store-feature";

const PIXEL = "data:image/png;base64,iVBORw0KGgo=";

describe("gráfico de destaque da Google Play (1024×500)", () => {
  const html = renderFeatureGraphic(PIXEL, "@font-face{font-family:Geist}");
  test("tamanho exato exigido pela Google Play", () => {
    expect(FEATURE_SIZE).toEqual({ width: 1024, height: 500 });
    expect(html).toContain("width:1024px;height:500px");
  });
  test("traz o nome, a frase do site em 2 linhas com destaque e a captura do app", () => {
    expect(html).toContain("Medicron");
    expect(html).toContain("Lembretes de remédio");
    expect(html.match(/<span class="ln">/g)).toHaveLength(2);
    expect(html).toContain("<em>gente e pets</em>");
    expect(html).toContain(`<img src="${PIXEL}"`);
  });
  test("sem recursos externos e sem 'bicho'", () => {
    expect(html).not.toMatch(/https?:\/\//);
    expect(html.toLowerCase()).not.toContain("bicho");
  });
  test("a Google Play pede texto mínimo: nada de preço, ranking ou promessa (só nome e frase)", () => {
    const visible = html.replace(/<style>[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ");
    expect(visible).not.toMatch(/gr[áa]tis|n[ºo]\s?1|melhor|baixe|download|\d+\s?%/i);
  });
});
