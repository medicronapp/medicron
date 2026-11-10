import { buildWidgetTimeline } from "../src/lib/widget-data";
import { DEMO_WIDGET_PROPS, WIDGET_DEMO_NOW, demoWidgetHome } from "../scripts/demo-data";
import { relativeIn, renderWidgetScreen } from "../scripts/store-widgets";
import { renderStoreSlide, STORE_SIZES, STORE_SLIDES } from "../scripts/store-slides";

describe("dados de demonstração dos widgets", () => {
  test("as props são exatamente o que o app calcularia (buildWidgetTimeline) para a hora e a tela da demonstração", () => {
    const [first] = buildWidgetTimeline(WIDGET_DEMO_NOW, demoWidgetHome());
    expect(first.date.getTime()).toBe(WIDGET_DEMO_NOW.getTime());
    expect(first.props).toEqual(DEMO_WIDGET_PROPS);
  });
  test("o momento é 11:40 de terça, 10/11/2026 (Brasília), com 1 pendente e as 2 próximas doses da Ana", () => {
    expect(WIDGET_DEMO_NOW.toISOString()).toBe("2026-11-10T14:40:00.000Z");
    expect(DEMO_WIDGET_PROPS).toMatchObject({ status: "ok", resolved: 3, total: 6, pendingCount: 1, pendingSince: "08:00" });
    expect(DEMO_WIDGET_PROPS.upcoming.map((u) => `${u.time} ${u.item} ${u.patient}`)).toEqual(["12:00 Losartana Ana", "20:00 Cálcio Ana"]);
  });
  test("a Losartana e o Cálcio da demonstração batem com a rotina da Ana (tela Rotina)", () => {
    const { demoPlans } = require("../scripts/demo-data") as typeof import("../scripts/demo-data");
    const names = demoPlans("pa_ana").map((p) => p.item?.name);
    expect(names).toEqual(expect.arrayContaining(["Losartana", "Cálcio"]));
  });
});

describe("relativeIn (a contagem do sistema, 'em 20 min')", () => {
  test.each([
    [0, "agora"], [20, "em 20 min"], [59, "em 59 min"], [60, "em 1 h"], [500, "em 8 h 20 min"], [120, "em 2 h"],
  ])("%i min → %s", (min, text) => expect(relativeIn(min * 60_000)).toBe(text));
});

describe("tela de bloqueio", () => {
  const html = renderWidgetScreen("lock", DEMO_WIDGET_PROPS, WIDGET_DEMO_NOW, 1);
  test("hora e data de Brasília, no formato do iOS", () => {
    expect(html).toContain("11:40");
    expect(html).toContain("terça-feira, 10 de novembro");
  });
  test("widget 'Agora': remédio, horário · paciente · contagem, e as pendentes (os textos do código do widget)", () => {
    expect(html).toContain("Losartana");
    expect(html).toContain("12:00");
    expect(html).toContain("· Ana ·");
    expect(html).toContain("em 20 min");
    expect(html).toContain("1 pendente desde 08:00");
  });
  test("widget 'Progresso': 'horário · paciente', remédio, as pendentes e a barra do dia 3/6", () => {
    expect(html).toContain("12:00 · Ana");
    expect(html).toContain("3/6");
    expect(html).toMatch(/class="bar"[^>]*><i style="width:50%"/);
  });
  test("a tela de bloqueio completa: botões de lanterna e câmera e a barra inicial (como no iPhone)", () => {
    expect(html).toContain('class="btns"');
    expect(html).toContain('class="homebar"');
  });
  test("a linha de pendentes do widget 'Agora' cabe nos 160 pt (o iOS reduz o texto: fonte ≤ 11,5 pt)", () => {
    const m = html.match(/\.ws-lock \.rect \.l3\{[^}]*font-size:([\d.]+)px/)!;
    expect(Number(m[1])).toBeLessThanOrEqual(11.5 * (948 / 430) + 0.1); // +0,1: arredondamento a 0,1 px
  });
  test("widget em linha: horário, remédio e pendentes abreviadas", () => {
    expect(html).toContain("12:00 Losartana · 1 pend.");
  });
  test("é dirigido pelas props (não tem texto fixo): outras props, outro texto", () => {
    const other = renderWidgetScreen("lock", { ...DEMO_WIDGET_PROPS, upcoming: [{ time: "08:30", item: "Vitamina D", patient: "Pedro", at: WIDGET_DEMO_NOW.getTime() + 3_000_000 }], pendingCount: 0, pendingSince: "" }, WIDGET_DEMO_NOW, 1);
    expect(other).toContain("Vitamina D");
    expect(other).toContain("08:30 · Pedro");
    expect(other).toContain("Sem pendências");
    expect(other).not.toContain("Losartana");
  });
});

describe("tela inicial (widget médio)", () => {
  const html = renderWidgetScreen("home", DEMO_WIDGET_PROPS, WIDGET_DEMO_NOW, 1);
  test("anel do dia: 3 e 'de 6', com o arco proporcional (50%)", () => {
    expect(html).toContain(">3<");
    expect(html).toContain("de 6");
    expect(html).toMatch(/stroke-dasharray="[\d.]+ [\d.]+"/);
  });
  test("as 2 próximas doses (horário, remédio, paciente, contagem) e o resumo de pendentes", () => {
    for (const t of ["12:00", "Losartana", "20:00", "Cálcio", "Ana", "em 20 min", "em 8 h 20 min", "1 pendente", "desde 08:00"]) expect(html).toContain(t);
  });
  test("a tela inicial tem 5 fileiras de ícones (o app Medicron entre eles) e o dock, sem cara de vazia", () => {
    expect(html.match(/class="app"/g)!.length).toBe(20);
    expect(html).toContain('class="dock"');
    expect(html).toContain(">Medicron<");
  });
  test("tudo em dia: sem pendentes mostra 'Sem pendências' (variante do código do widget)", () => {
    const ok = renderWidgetScreen("home", { ...DEMO_WIDGET_PROPS, pendingCount: 0, pendingSince: "" }, WIDGET_DEMO_NOW, 1);
    expect(ok).toContain("Sem pendências");
  });
});

describe("slides de widgets no roteiro", () => {
  test("viram os slides 6 e 7: tela de bloqueio (escuro) e tela inicial (claro)", () => {
    expect(STORE_SLIDES.slice(5).map((s) => [s.id, s.kind, s.theme])).toEqual([["bloqueio", "lock", "dark"], ["widget", "home", "light"]]);
  });
  test("o HTML do slide traz o título, as medidas do tamanho pedido, nenhuma imagem de captura e nada de fora", () => {
    for (const s of STORE_SLIDES.slice(5)) {
      const html = renderStoreSlide(s, STORE_SIZES[1], "", "");
      expect(html).toContain(s.title);
      expect(html).toContain("width:1284px;height:2778px");
      expect(html).not.toContain("<img");
      expect(html).not.toMatch(/https?:\/\//);
    }
  });
  test("a escala acompanha a largura (6,5\" usa medidas menores que o 6,9\")", () => {
    const big = renderWidgetScreen("lock", DEMO_WIDGET_PROPS, WIDGET_DEMO_NOW, 1);
    const small = renderWidgetScreen("lock", DEMO_WIDGET_PROPS, WIDGET_DEMO_NOW, 1284 / 1320);
    expect(big).not.toBe(small);
  });
});
