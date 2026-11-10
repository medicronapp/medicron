import fs from "node:fs";
import path from "node:path";
import { signedOutProps, type WidgetProps } from "@/lib/widget-data";

jest.mock("expo-widgets", () => ({
  createWidget: (name: string, layout: unknown, initialProps: unknown) => ({ name, layout, initialProps, updateTimeline: jest.fn() }),
}));
jest.mock("@expo/ui/swift-ui", () => ({}));
jest.mock("@expo/ui/swift-ui/modifiers", () => ({}));

import widget from "@/widgets/medicron-agora-widget";
import { helpers, loadLayout, AT, ok, type El } from "./widget-harness";

const { render, text, all, has } = helpers(loadLayout(widget));
const FAMILIES = ["accessoryRectangular", "accessoryInline"];
const styleOf = (e: El) => (e.props!.modifiers!.find((m) => m.m === "font")!.a[0] as { textStyle: string }).textStyle;
const byText = (p: WidgetProps, t: string) => all(p, "accessoryRectangular").find((e) => e.type === "Text" && e.props!.children === t)!;

test("é o widget 'Agora': nome próprio na galeria e estado inicial sem dados", () => {
  expect((widget as unknown as { name: string }).name).toBe("MedicronAgoraWidget");
  expect((widget as unknown as { initialProps: WidgetProps }).initialProps).toEqual(signedOutProps());
});

describe("retangular: três linhas, largura total (sem anel)", () => {
  test("linha 1 o remédio; linha 2 horário, paciente e a contagem do sistema; linha 3 as pendentes com símbolo", () => {
    const t = text(ok(), "accessoryRectangular");
    for (const s of ["Losartana", "12:00", "Mel", "3 pendentes desde 06:00"]) expect(t).toContain(s);
    const dates = all(ok(), "accessoryRectangular").filter((e) => e.type === "Text" && e.props!.date instanceof Date);
    expect(dates).toHaveLength(1);
    expect((dates[0].props!.date as Date).getTime()).toBe(AT);
    expect(dates[0].props!.dateStyle).toBe("relative");
    expect(has(ok(), "accessoryRectangular", "Image", (e) => e.props!.systemName === "exclamationmark.circle.fill")).toBe(true);
  });
  test("sem anel: o texto usa a largura inteira", () => {
    expect(has(ok(), "accessoryRectangular", "Gauge")).toBe(false);
  });
  test("o remédio ganha a linha toda e reduz a fonte (até 75%, ≥ 11 pt) antes de cortar", () => {
    const item = byText(ok(), "Losartana");
    expect(styleOf(item)).toBe("subheadline");
    const mods = item.props!.modifiers!;
    expect(mods.find((m) => m.m === "lineLimit")!.a[0]).toBe(1);
    expect(mods.find((m) => m.m === "minimumScaleFactor")!.a[0]).toBe(0.75);
  });
  test("as linhas 2 e 3 também reduzem antes de cortar (o texto de pendentes é o mais comprido)", () => {
    const pend = all(ok(), "accessoryRectangular").find((e) => e.type === "Text" && String(e.props!.children).startsWith("3 pendentes"))!;
    expect(pend.props!.modifiers!.find((m) => m.m === "minimumScaleFactor")!.a[0]).toBe(0.75);
    expect(pend.props!.modifiers!.find((m) => m.m === "lineLimit")!.a[0]).toBe(1);
  });
  test("horário com dígitos tabulares", () => {
    expect(byText(ok(), "12:00").props!.modifiers!.some((m) => m.m === "monospacedDigit")).toBe(true);
  });
  test("1 pendente no singular; sem pendências com ✓", () => {
    expect(text(ok({ pendingCount: 1 }), "accessoryRectangular")).toContain("1 pendente desde 06:00");
    const p = ok({ pendingCount: 0, pendingSince: "" });
    expect(text(p, "accessoryRectangular")).toContain("Sem pendências");
    expect(has(p, "accessoryRectangular", "Image", (e) => e.props!.systemName === "checkmark.circle.fill")).toBe(true);
  });
  test("tudo em dia: título e o progresso do dia em texto", () => {
    const p = ok({ resolved: 5, total: 5, upcoming: [], pendingCount: 0, pendingSince: "" });
    expect(text(p, "accessoryRectangular")).toContain("Tudo em dia");
    expect(text(p, "accessoryRectangular")).toContain("5 de 5 doses feitas hoje");
  });
  test("sem próximas mas com pendentes: não inventa uma dose", () => {
    const t = text(ok({ upcoming: [] }), "accessoryRectangular");
    expect(t).toContain("Nenhuma dose a seguir");
    expect(t).toContain("3 pendentes");
  });
});

describe("em linha", () => {
  test("uma linha curta com símbolo", () => {
    expect(text(ok(), "accessoryInline")).toBe("12:00 Losartana · 3 pend.");
    expect(text(ok({ pendingCount: 0 }), "accessoryInline")).toBe("12:00 Losartana");
    expect(has(ok(), "accessoryInline", "Image", (e) => e.props!.systemName === "pills.fill")).toBe(true);
  });
});

describe("estados (todas as famílias)", () => {
  test.each(FAMILIES)("sem sessão (%s)", (f) => {
    expect(text(signedOutProps(), f)).toContain("Entre no Medicron para ver suas doses");
    expect(text(signedOutProps(), f)).not.toMatch(/Losartana|Mel/);
  });
  test.each(FAMILIES)("sem doses hoje (%s)", (f) => {
    expect(text({ ...signedOutProps(), status: "empty" }, f)).toContain("Sem doses hoje");
  });
  test.each(FAMILIES)("dado de ontem (%s)", (f) => {
    const t = text({ ...signedOutProps(), status: "stale" }, f);
    expect(t).toContain("Abra o Medicron para atualizar");
    expect(t).not.toMatch(/Losartana|Nenhuma dose/);
  });
  test.each(FAMILIES)("tudo em dia (%s)", (f) => {
    expect(text(ok({ resolved: 5, total: 5, upcoming: [], pendingCount: 0, pendingSince: "" }), f)).toContain("Tudo em dia");
  });
});

describe("padrão Apple e contrato do runtime", () => {
  test.each(FAMILIES)("%s: fundo do widget e toque abre a Hoje", (f) => {
    const mods = render(ok(), f).props!.modifiers!;
    expect(mods.map((m) => m.m)).toEqual(expect.arrayContaining(["containerBackground", "widgetURL"]));
    expect(mods.find((m) => m.m === "widgetURL")!.a[0]).toBe("medicron://");
  });
  test("estilos de texto do sistema, nada abaixo de 11 pt e nenhuma fonte de código", () => {
    for (const f of FAMILIES) for (const e of all(ok(), f)) for (const m of e.props?.modifiers ?? []) {
      if (m.m !== "font") continue;
      const p = m.a[0] as { size?: number; textStyle?: string; design?: string };
      expect(p.design).not.toBe("monospaced");
      expect(p.textStyle !== undefined || (p.size ?? 0) >= 11).toBe(true);
    }
  });
  test("é puro: as mesmas props dão a mesma árvore", () => {
    expect(JSON.stringify(render(ok(), "accessoryRectangular"))).toBe(JSON.stringify(render(ok(), "accessoryRectangular")));
  });
  test("o fonte só importa valores de expo-widgets, @expo/ui e react-native; do app, só tipos; é autossuficiente", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "src/widgets/medicron-agora-widget.tsx"), "utf8");
    for (const i of [...src.matchAll(/^import (?!type\b).* from "(.+)";$/gm)].map((m) => m[1])) {
      expect(["expo-widgets", "@expo/ui/swift-ui", "@expo/ui/swift-ui/modifiers", "react-native"]).toContain(i);
    }
    for (const line of [...src.matchAll(/^import .* from "@\/.+";$/gm)].map((m) => m[0])) expect(line).toMatch(/^import type /);
    expect(src).toMatch(/'widget';|"widget";/);
    expect(src).not.toMatch(/from "\.\//); // nada de outro arquivo do widget: o texto da função é avaliado isolado
  });
});
