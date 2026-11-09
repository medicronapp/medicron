import fs from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";
import { signedOutProps, type WidgetProps } from "@/lib/widget-data";

// Os módulos nativos viram elementos simples: o teste anda pela árvore devolvida pelo componente do widget.
jest.mock("expo-widgets", () => ({
  createWidget: (name: string, layout: unknown, initialProps: unknown) => ({ name, layout, initialProps, updateTimeline: jest.fn() }),
}));
jest.mock("@expo/ui/swift-ui", () => {
  const make = (tag: string) => Object.assign(() => null, { displayName: tag });
  return { VStack: make("VStack"), HStack: make("HStack"), Text: make("Text"), Spacer: make("Spacer"), Divider: make("Divider") };
});
jest.mock("@expo/ui/swift-ui/modifiers", () => ({
  containerBackground: (...a: unknown[]) => ({ m: "containerBackground", a }),
  font: (a: unknown) => ({ m: "font", a }),
  foregroundStyle: (a: unknown) => ({ m: "foregroundStyle", a }),
  padding: (a: unknown) => ({ m: "padding", a }),
  lineLimit: (a: unknown) => ({ m: "lineLimit", a }),
}));

import widget from "@/widgets/medicron-widget";

type El = { type?: { displayName?: string }; props?: { children?: ReactNode; modifiers?: { m: string }[] } };
const texts = (node: ReactNode): string[] => {
  if (node == null || typeof node === "boolean") return [];
  if (typeof node === "string" || typeof node === "number") return [String(node)];
  if (Array.isArray(node)) return node.flatMap(texts);
  return texts((node as El).props?.children);
};
const modifiersOf = (node: ReactNode): string[] => {
  if (node == null || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(modifiersOf);
  const el = node as El;
  return [...(el.props?.modifiers?.map((m) => m.m) ?? []), ...modifiersOf(el.props?.children)];
};

// O Babel (preset do Expo) transforma o componente com a diretiva 'widget' no TEXTO de uma função, que a extensão do iOS
// avalia com os componentes e modificadores do @expo/ui como globais. O teste a avalia do mesmo jeito, com globais simulados.
const el = (type: unknown, props: Record<string, unknown>) => ({ type, props });
const globalsFor = () => ({
  _jsx: el, _jsxs: el, _Fragment: "Fragment",
  Text: "Text", VStack: "VStack", HStack: "HStack", Spacer: "Spacer",
  containerBackground: (...a: unknown[]) => ({ m: "containerBackground", a }),
  font: (a: unknown) => ({ m: "font", a }),
  foregroundStyle: (a: unknown) => ({ m: "foregroundStyle", a }),
  padding: (a: unknown) => ({ m: "padding", a }),
  lineLimit: (a: unknown) => ({ m: "lineLimit", a }),
  PlatformColor: (...a: string[]) => ({ semantic: a }),
});
const source = (widget as unknown as { layout: unknown }).layout;
if (typeof source !== "string") throw new Error("o Babel deveria ter transformado o componente 'widget' em texto");
const globals = globalsFor();
const layout = new Function(...Object.keys(globals), `return (${source});`)(...Object.values(globals)) as (p: WidgetProps, e: { widgetFamily: string }) => ReactNode;
const render = (props: WidgetProps, family: string) => layout(props, { widgetFamily: family });
const text = (props: WidgetProps, family: string) => texts(render(props, family)).join(" | ");

const item = (over: Partial<WidgetProps["upcoming"][number]> = {}) => ({ time: "08:00", item: "Losartana", patient: "Mel", late: false, ...over });
const ok = (over: Partial<WidgetProps> = {}): WidgetProps => ({
  status: "ok", upcoming: [item(), item({ time: "12:00", item: "Vermífugo", patient: "Tom" })], pending: [item({ time: "06:00", item: "Insulina", late: true })],
  upcomingCount: 2, pendingCount: 1, updatedAt: "07:55", ...over,
});

test("é registrado com o nome do plugin e um estado inicial sem dados (nada de paciente na galeria)", () => {
  expect((widget as unknown as { name: string }).name).toBe("MedicronWidget");
  expect((widget as unknown as { initialProps: WidgetProps }).initialProps).toEqual(signedOutProps()); // o literal do widget = o do app
});

describe("médio", () => {
  test("duas colunas: próximas com horário, remédio e paciente; pendentes com horário e remédio", () => {
    const t = text(ok(), "systemMedium");
    for (const expected of ["Medicron", "Atualizado 07:55", "Próximas", "08:00", "Losartana", "Mel", "12:00", "Vermífugo", "Tom", "Pendentes", "06:00", "Insulina"]) {
      expect(t).toContain(expected);
    }
  });
  test("mostra quantas ficaram de fora quando a lista é maior que o espaço", () => {
    const t = text(ok({ upcomingCount: 7, pendingCount: 4 }), "systemMedium");
    expect(t).toContain("+5 a seguir");
    expect(t).toContain("+3 pendentes");
  });
  test("coluna vazia diz isso", () => {
    expect(text(ok({ upcoming: [], upcomingCount: 0 }), "systemMedium")).toContain("Nenhuma a seguir");
    expect(text(ok({ pending: [], pendingCount: 0 }), "systemMedium")).toContain("Nenhuma pendente");
  });
});

describe("tela de bloqueio", () => {
  test("retangular: próxima dose e contagem de pendentes (singular e plural)", () => {
    expect(text(ok(), "accessoryRectangular")).toContain("08:00 · Losartana");
    expect(text(ok(), "accessoryRectangular")).toContain("1 pendente");
    expect(text(ok({ pendingCount: 3 }), "accessoryRectangular")).toContain("3 pendentes");
  });
  test("retangular sem pendentes: 'Tudo em dia'; sem próximas: 'Sem próximas'", () => {
    expect(text(ok({ pending: [], pendingCount: 0 }), "accessoryRectangular")).toContain("Tudo em dia");
    expect(text(ok({ upcoming: [], upcomingCount: 0 }), "accessoryRectangular")).toContain("Sem próximas");
  });
  test("em linha: tudo em uma linha curta", () => {
    expect(text(ok(), "accessoryInline")).toBe("08:00 Losartana · 1 pendente");
    expect(text(ok({ pending: [], pendingCount: 0 }), "accessoryInline")).toBe("08:00 Losartana");
  });
});

describe("estados do widget (todas as famílias)", () => {
  test.each(["systemMedium", "accessoryRectangular", "accessoryInline"])("sem sessão (%s): só 'Abra o Medicron para entrar'", (family) => {
    expect(text(signedOutProps(), family)).toContain("Abra o Medicron para entrar");
    expect(text(signedOutProps(), family)).not.toMatch(/Losartana|Mel/);
  });
  test.each(["systemMedium", "accessoryRectangular", "accessoryInline"])("sem doses hoje (%s)", (family) => {
    expect(text({ ...ok({ upcoming: [], pending: [], upcomingCount: 0, pendingCount: 0 }), status: "empty" }, family)).toContain("Sem doses hoje");
  });
  test.each(["systemMedium", "accessoryRectangular", "accessoryInline"])("tudo em dia (%s)", (family) => {
    expect(text(ok({ upcoming: [], pending: [], upcomingCount: 0, pendingCount: 0 }), family)).toContain("Tudo em dia");
  });
});

describe("dado de ontem", () => {
  test.each(["systemMedium", "accessoryRectangular", "accessoryInline"])("%s: pede para abrir o app, sem mostrar listas", (family) => {
    const t = text({ ...ok(), status: "stale", upcoming: [], pending: [], upcomingCount: 0, pendingCount: 0 }, family);
    expect(t).toContain("Abra o Medicron para atualizar");
    expect(t).not.toMatch(/Losartana|Nenhuma a seguir/);
  });
});

describe("contrato do runtime do widget", () => {
  test("a raiz de cada família tem o fundo do widget (obrigatório no iOS 17+)", () => {
    for (const f of ["systemMedium", "accessoryRectangular", "accessoryInline"]) {
      expect(modifiersOf(render(ok(), f))).toContain("containerBackground");
    }
  });
  test("é puro: as mesmas props dão a mesma árvore (sem hooks nem estado)", () => {
    expect(JSON.stringify(render(ok(), "systemMedium"))).toBe(JSON.stringify(render(ok(), "systemMedium")));
  });
  test("o fonte só importa VALORES de expo-widgets, @expo/ui e react-native (o registro de layouts do build resolve o resto como módulo vazio)", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "src/widgets/medicron-widget.tsx"), "utf8");
    const valueImports = [...src.matchAll(/^import (?!type\b).* from "(.+)";$/gm)].map((m) => m[1]);
    for (const i of valueImports) expect(["expo-widgets", "@expo/ui/swift-ui", "@expo/ui/swift-ui/modifiers", "react-native"]).toContain(i);
    const appImports = [...src.matchAll(/^import .* from "@\/.+";$/gm)].map((m) => m[0]);
    for (const line of appImports) expect(line).toMatch(/^import type /); // do app, só tipos (somem na compilação)
    expect(src).toMatch(/'widget';|"widget";/);
    expect(src).not.toMatch(/use(State|Effect|Memo|Ref|Callback)\(/);
  });
});
