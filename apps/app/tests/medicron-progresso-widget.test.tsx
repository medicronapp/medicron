import fs from "node:fs";
import path from "node:path";
import { signedOutProps, type WidgetProps } from "@/lib/widget-data";

jest.mock("expo-widgets", () => ({
  createWidget: (name: string, layout: unknown, initialProps: unknown) => ({ name, layout, initialProps, updateTimeline: jest.fn() }),
}));
jest.mock("@expo/ui/swift-ui", () => ({}));
jest.mock("@expo/ui/swift-ui/modifiers", () => ({}));

import widget from "@/widgets/medicron-progresso-widget";
import { helpers, loadLayout, ok, type El } from "./widget-harness";

const { render, text, all, has } = helpers(loadLayout(widget));
const F = "accessoryRectangular";
const styleOf = (e: El) => (e.props!.modifiers!.find((m) => m.m === "font")!.a[0] as { textStyle: string }).textStyle;
const byText = (p: WidgetProps, t: string) => all(p, F).find((e) => e.type === "Text" && e.props!.children === t)!;

test("é o widget 'Progresso': nome próprio na galeria e estado inicial sem dados", () => {
  expect((widget as unknown as { name: string }).name).toBe("MedicronProgressoWidget");
  expect((widget as unknown as { initialProps: WidgetProps }).initialProps).toEqual(signedOutProps());
});

describe("barra do dia (sem anel)", () => {
  const bar = (p: WidgetProps) => all(p, F).find((e) => e.type === "Gauge")!;
  test("uma barra horizontal nativa com a fração do dia (e rótulo para o VoiceOver); não há anel", () => {
    const g = bar(ok());
    expect(g.props!.value).toBeCloseTo(0.6);
    expect(g.props!.modifiers!.some((m) => m.m === "gaugeStyle" && m.a[0] === "linearCapacity")).toBe(true);
    expect(g.props!.modifiers!.find((m) => m.m === "accessibilityLabel")!.a[0]).toBe("3 de 5 doses feitas hoje");
    expect(all(ok(), F).some((e) => e.type === "ZStack")).toBe(false);
    expect(text(ok(), F)).not.toContain("pend.");
  });
  test("linha 1: horário e paciente; linha 2: o remédio, que reduz até 75% antes de cortar", () => {
    expect(text(ok(), F)).toContain("12:00 · Mel");
    const item = byText(ok(), "Losartana");
    expect(styleOf(item)).toBe("subheadline");
    expect(item.props!.modifiers!.find((m) => m.m === "lineLimit")!.a[0]).toBe(1);
    expect(item.props!.modifiers!.find((m) => m.m === "minimumScaleFactor")!.a[0]).toBe(0.75);
  });
  test("ao lado da barra: pendentes com símbolo (não só cor) e o 'feitas/total' com dígitos tabulares", () => {
    expect(has(ok(), F, "Image", (e) => e.props!.systemName === "exclamationmark.circle.fill")).toBe(true);
    expect(byText(ok(), "3")).toBeDefined();
    const frac = byText(ok(), "3/5");
    expect(frac.props!.modifiers!.some((m) => m.m === "monospacedDigit")).toBe(true);
  });
  test("sem pendências: nada de símbolo nem '0'; a barra e o 'feitas/total' continuam", () => {
    const p = ok({ pendingCount: 0, pendingSince: "" });
    expect(has(p, F, "Image")).toBe(false);
    expect(all(p, F).some((e) => e.type === "Text" && e.props!.children === "0")).toBe(false);
    expect(text(p, F)).toContain("3/5");
    expect(bar(p)).toBeDefined();
  });
  test("o horário tem dígitos tabulares", () => {
    const line = all(ok(), F).find((e) => e.type === "Text" && String(e.props!.children).startsWith("12:00"))!;
    expect(line.props!.modifiers!.some((m) => m.m === "monospacedDigit")).toBe(true);
  });
  test("tudo em dia: título, barra cheia e '5/5'", () => {
    const p = ok({ resolved: 5, total: 5, upcoming: [], pendingCount: 0, pendingSince: "" });
    expect(text(p, F)).toContain("Tudo em dia");
    expect(text(p, F)).toContain("5/5");
    expect(bar(p).props!.value).toBe(1);
  });
  test("sem próximas mas com pendentes: não inventa uma dose e mostra as pendentes", () => {
    const t = text(ok({ upcoming: [] }), F);
    expect(t).toContain("Nenhuma dose a seguir");
    expect(has(ok({ upcoming: [] }), F, "Image", (e) => e.props!.systemName === "exclamationmark.circle.fill")).toBe(true);
  });
});

describe("estados", () => {
  test("sem sessão, sem doses hoje e dado de ontem, sem nada de paciente", () => {
    expect(text(signedOutProps(), F)).toContain("Entre no Medicron para ver suas doses");
    expect(text({ ...signedOutProps(), status: "empty" }, F)).toContain("Sem doses hoje");
    expect(text({ ...signedOutProps(), status: "stale" }, F)).toContain("Abra o Medicron para atualizar");
    expect(text(signedOutProps(), F)).not.toMatch(/Losartana|Mel/);
  });
});

describe("padrão Apple e contrato do runtime", () => {
  test("fundo do widget e toque abre a Hoje", () => {
    const mods = render(ok(), F).props!.modifiers!;
    expect(mods.map((m) => m.m)).toEqual(expect.arrayContaining(["containerBackground", "widgetURL"]));
    expect(mods.find((m) => m.m === "widgetURL")!.a[0]).toBe("medicron://");
  });
  test("estilos de texto do sistema, nada abaixo de 11 pt e nenhuma fonte de código", () => {
    for (const e of all(ok(), F)) for (const m of e.props?.modifiers ?? []) {
      if (m.m !== "font") continue;
      const p = m.a[0] as { size?: number; textStyle?: string; design?: string };
      expect(p.design).not.toBe("monospaced");
      expect(p.textStyle !== undefined || (p.size ?? 0) >= 11).toBe(true);
    }
  });
  test("é puro e o fonte é autossuficiente (só valores de expo-widgets, @expo/ui e react-native)", () => {
    expect(JSON.stringify(render(ok(), F))).toBe(JSON.stringify(render(ok(), F)));
    const src = fs.readFileSync(path.join(__dirname, "..", "src/widgets/medicron-progresso-widget.tsx"), "utf8");
    for (const i of [...src.matchAll(/^import (?!type\b).* from "(.+)";$/gm)].map((m) => m[1])) {
      expect(["expo-widgets", "@expo/ui/swift-ui", "@expo/ui/swift-ui/modifiers", "react-native"]).toContain(i);
    }
    for (const line of [...src.matchAll(/^import .* from "@\/.+";$/gm)].map((m) => m[0])) expect(line).toMatch(/^import type /);
    expect(src).toMatch(/'widget';|"widget";/);
    expect(src).not.toMatch(/from "\.\//);
  });
});
