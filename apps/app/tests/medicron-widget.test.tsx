import fs from "node:fs";
import path from "node:path";
import { signedOutProps, type WidgetProps } from "@/lib/widget-data";

// Os módulos nativos viram elementos simples: o teste anda pela árvore devolvida pelo componente do widget.
jest.mock("expo-widgets", () => ({
  createWidget: (name: string, layout: unknown, initialProps: unknown) => ({ name, layout, initialProps, updateTimeline: jest.fn() }),
}));
jest.mock("@expo/ui/swift-ui", () => ({}));
jest.mock("@expo/ui/swift-ui/modifiers", () => ({}));

import widget from "@/widgets/medicron-widget";

import { helpers, loadLayout, AT, ok, type El } from "./widget-harness";

const { render, text, all, has } = helpers(loadLayout(widget));
const FAMILIES = ["systemMedium"];
test("é registrado com o nome do plugin e um estado inicial sem dados (nada de paciente na galeria)", () => {
  expect((widget as unknown as { name: string }).name).toBe("MedicronWidget");
  expect((widget as unknown as { initialProps: WidgetProps }).initialProps).toEqual(signedOutProps()); // o literal do widget = o do app
});

describe("médio: anel do dia + próximas + pendentes", () => {
  test("o anel é o Gauge circular nativo, AMPLIADO (o iOS o desenha pequeno): escala ≥ 1,8 e miolo sem texto largo", () => {
    const g = all(ok(), "systemMedium").find((e) => e.type === "Gauge")!;
    expect(g.props!.value).toBeCloseTo(0.6);
    const mods = g.props!.modifiers!;
    expect(mods.some((m) => m.m === "gaugeStyle" && m.a[0] === "circularCapacity")).toBe(true);
    const scale = mods.find((m) => m.m === "scaleEffect")!.a[0] as number;
    expect(scale).toBeGreaterThanOrEqual(1.8);
    // O espaço reservado no layout acompanha o tamanho final (senão o anel invade os vizinhos).
    const box = all(ok(), "systemMedium").find((e) => e.type === "ZStack" && e.props!.modifiers!.some((m) => m.m === "frame"))!;
    const side = (box.props!.modifiers!.find((m) => m.m === "frame")!.a[0] as { width: number }).width;
    const gaugeFrame = (mods.find((m) => m.m === "frame")!.a[0] as { width: number }).width;
    expect(side).toBeGreaterThanOrEqual(96);
    expect(Math.abs(side - gaugeFrame * scale)).toBeLessThanOrEqual(6);
  });
  test("o miolo mostra só o número feito (grande) e 'de N' pequeno, nunca o '10/13' largo que invadia o traço", () => {
    const t = text(ok({ resolved: 10, total: 13 }), "systemMedium");
    expect(t).toContain("10 | de 13");
    expect(t).not.toContain("10/13");
    const numeral = all(ok({ resolved: 10, total: 13 }), "systemMedium").find((e) => e.type === "Text" && e.props!.children === "10")!;
    expect(numeral.props!.modifiers!.some((m) => m.m === "minimumScaleFactor")).toBe(true);
  });
  test("as 2 próximas: horário, remédio e paciente; a contagem 'em ...' é do sistema (Text com date relativo, não texto fixo)", () => {
    const t = text(ok(), "systemMedium");
    for (const s of ["12:00", "Losartana", "Mel", "18:00", "Insulina", "Tom"]) expect(t).toContain(s);
    const dates = all(ok(), "systemMedium").filter((e) => e.type === "Text" && e.props!.date instanceof Date);
    expect(dates.map((d) => (d.props!.date as Date).getTime())).toEqual([AT, AT + 6 * 3_600_000]);
    expect(dates.every((d) => d.props!.dateStyle === "relative")).toBe(true);
  });
  test("aproveita a altura do widget: remédio e horário em 'headline', paciente/contagem em 'subheadline' (antes ocupavam só uma faixa)", () => {
    const styleOf = (el: El) => (el.props!.modifiers!.find((m) => m.m === "font")!.a[0] as { textStyle: string }).textStyle;
    const byText = (t: string) => all(ok(), "systemMedium").find((e) => e.type === "Text" && e.props!.children === t)!;
    expect(styleOf(byText("Losartana"))).toBe("headline");
    expect(styleOf(byText("12:00"))).toBe("headline");
    expect(styleOf(byText("Mel"))).toBe("subheadline");
    const dates = all(ok(), "systemMedium").filter((e) => e.type === "Text" && e.props!.date instanceof Date);
    expect(dates.every((d) => styleOf(d) === "subheadline")).toBe(true);
  });
  test("pendentes com símbolo (não só cor): '3 pendentes' e 'desde 06:00'; singular com 1", () => {
    expect(text(ok(), "systemMedium")).toContain("3 pendentes");
    expect(text(ok(), "systemMedium")).toContain("desde 06:00");
    expect(has(ok(), "systemMedium", "Image", (e) => e.props!.systemName === "exclamationmark.circle.fill")).toBe(true);
    expect(text(ok({ pendingCount: 1 }), "systemMedium")).toContain("1 pendente");
    expect(text(ok({ pendingCount: 1 }), "systemMedium")).not.toContain("1 pendentes");
  });
  test("sem pendências: 'Sem pendências' com ✓, e nada de 'desde'", () => {
    const p = ok({ pendingCount: 0, pendingSince: "" });
    expect(text(p, "systemMedium")).toContain("Sem pendências");
    expect(text(p, "systemMedium")).not.toContain("desde");
    expect(has(p, "systemMedium", "Image", (e) => e.props!.systemName === "checkmark.circle.fill")).toBe(true);
  });
  test("sem próximas mas com pendentes: 'Nenhuma dose a seguir'", () => {
    expect(text(ok({ upcoming: [] }), "systemMedium")).toContain("Nenhuma dose a seguir");
  });
  test("tudo em dia: anel cheio e 'Tudo em dia'", () => {
    const p = ok({ resolved: 5, total: 5, upcoming: [], pendingCount: 0, pendingSince: "" });
    expect(text(p, "systemMedium")).toContain("Tudo em dia");
    expect(text(p, "systemMedium")).toContain("5 | de 5");
  });
  test("verde de acento mais claro no escuro (o mesmo da tela de entrada no claro)", () => {
    const colorOf = (scheme: string) => JSON.stringify(render(ok(), "systemMedium", scheme));
    expect(colorOf("light")).toContain("#0f766e");
    expect(colorOf("dark")).toContain("#2dd4bf");
  });
});

describe("estados (todas as famílias)", () => {
  test.each(FAMILIES)("sem sessão (%s): ensina o que fazer e não mostra nada de paciente", (family) => {
    expect(text(signedOutProps(), family)).toContain("Entre no Medicron para ver suas doses");
    expect(text(signedOutProps(), family)).not.toMatch(/Losartana|Mel/);
  });
  test.each(FAMILIES)("sem doses hoje (%s)", (family) => {
    expect(text({ ...signedOutProps(), status: "empty" }, family)).toContain("Sem doses hoje");
  });
  test.each(FAMILIES)("dado de ontem (%s): pede para abrir o app, sem listas", (family) => {
    const t = text({ ...signedOutProps(), status: "stale" }, family);
    expect(t).toContain("Abra o Medicron para atualizar");
    expect(t).not.toMatch(/Losartana|Nenhuma dose/);
  });
  test.each(FAMILIES)("tudo em dia (%s)", (family) => {
    expect(text(ok({ resolved: 5, total: 5, upcoming: [], pendingCount: 0, pendingSince: "" }), family)).toContain("Tudo em dia");
  });
});

describe("padrão Apple e contrato do runtime do widget", () => {
  test.each(FAMILIES)("%s: fundo do widget (iOS 17+) e toque abre a tela Hoje (medicron://)", (family) => {
    const mods = (render(ok(), family).props?.modifiers ?? []).map((m) => m.m);
    expect(mods).toContain("containerBackground");
    expect(mods).toContain("widgetURL");
    const url = (render(ok(), family).props!.modifiers!.find((m) => m.m === "widgetURL")!.a[0]);
    expect(url).toBe("medicron://");
  });
  test("tipografia do sistema: estilos de texto (Dynamic Type) e nenhuma fonte fixa abaixo de 11 pt; nada de SF Mono", () => {
    for (const f of FAMILIES) {
      for (const e of all(ok(), f)) {
        for (const m of e.props?.modifiers ?? []) {
          if (m.m !== "font") continue;
          const p = m.a[0] as { size?: number; textStyle?: string; design?: string };
          expect(p.design).not.toBe("monospaced");
          expect(p.textStyle !== undefined || (p.size ?? 0) >= 11).toBe(true);
        }
      }
    }
  });
  test("horários com dígitos tabulares (monospacedDigit), não fonte de código", () => {
    const timeTexts = all(ok(), "systemMedium").filter((e) => e.type === "Text" && ["12:00", "18:00"].includes(String(e.props!.children)));
    expect(timeTexts.length).toBe(2);
    expect(timeTexts.every((e) => e.props!.modifiers!.some((m) => m.m === "monospacedDigit"))).toBe(true);
  });
  test("o anel tem rótulo de acessibilidade (VoiceOver)", () => {
    const g = all(ok(), "systemMedium").find((e) => e.type === "Gauge")!;
    expect(g.props!.modifiers!.find((m) => m.m === "accessibilityLabel")!.a[0]).toBe("3 de 5 doses feitas hoje");
  });
  test("é puro: as mesmas props dão a mesma árvore (sem hooks nem estado)", () => {
    expect(JSON.stringify(render(ok(), "systemMedium"))).toBe(JSON.stringify(render(ok(), "systemMedium")));
  });
  test("o fonte só importa VALORES de expo-widgets, @expo/ui e react-native (o registro de layouts do build resolve o resto como módulo vazio)", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "src/widgets/medicron-widget.tsx"), "utf8");
    const valueImports = [...src.matchAll(/^import (?!type\b).* from "(.+)";$/gm)].map((m) => m[1]);
    for (const i of valueImports) expect(["expo-widgets", "@expo/ui/swift-ui", "@expo/ui/swift-ui/modifiers", "react-native"]).toContain(i);
    const appImports = [...src.matchAll(/^import .* from "@\/.+";$/gm)].map((m) => m[0]);
    for (const line of appImports) expect(line).toMatch(/^import type /);
    expect(src).toMatch(/'widget';|"widget";/);
    expect(src).not.toMatch(/use(State|Effect|Memo|Ref|Callback)\(/);
  });
});

test("o widget médio não trata mais tela de bloqueio (agora são os widgets Agora e Progresso)", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "src/widgets/medicron-widget.tsx"), "utf8");
  expect(src).not.toContain("accessory");
});
