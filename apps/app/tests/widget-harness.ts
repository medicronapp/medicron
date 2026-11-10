import type { ReactNode } from "react";
import type { WidgetProps } from "@/lib/widget-data";

/**
 * Ajudante dos testes dos widgets. O Babel (preset do Expo) transforma o componente com a diretiva 'widget' no TEXTO de
 * uma função, que a extensão do iOS avalia com os componentes e modificadores do @expo/ui como globais. Aqui ela é
 * avaliada do mesmo jeito, com globais simulados que viram elementos simples, e a árvore é percorrida.
 */
export type El = { type?: string; props?: { children?: ReactNode; modifiers?: { m: string; a: unknown[] }[]; [k: string]: unknown } };

const el = (type: unknown, props: Record<string, unknown>) => ({ type, props });
const mod = (m: string) => (...a: unknown[]) => ({ m, a });

export function loadLayout(widget: unknown): (p: WidgetProps, e: { widgetFamily: string; colorScheme?: string }) => El {
  const source = (widget as { layout: unknown }).layout;
  if (typeof source !== "string") throw new Error("o Babel deveria ter transformado o componente 'widget' em texto");
  const globals: Record<string, unknown> = {
    _jsx: el, _jsxs: el, _Fragment: "Fragment",
    Text: "Text", VStack: "VStack", HStack: "HStack", ZStack: "ZStack", Spacer: "Spacer", Divider: "Divider", Image: "Image", Gauge: "Gauge",
    containerBackground: mod("containerBackground"), font: mod("font"), foregroundStyle: mod("foregroundStyle"), padding: mod("padding"),
    lineLimit: mod("lineLimit"), monospacedDigit: mod("monospacedDigit"), widgetURL: mod("widgetURL"), gaugeStyle: mod("gaugeStyle"),
    tint: mod("tint"), frame: mod("frame"), scaleEffect: mod("scaleEffect"), accessibilityLabel: mod("accessibilityLabel"),
    minimumScaleFactor: mod("minimumScaleFactor"),
    PlatformColor: (...a: string[]) => ({ semantic: a }),
  };
  return new Function(...Object.keys(globals), `return (${source});`)(...Object.values(globals));
}

export const walk = (node: unknown, out: El[] = []): El[] => {
  if (node == null || typeof node !== "object") return out;
  if (Array.isArray(node)) { node.forEach((n) => walk(n, out)); return out; }
  const e = node as El;
  if (e.type !== undefined) out.push(e);
  walk(e.props?.children, out);
  return out;
};

export const texts = (node: unknown): string[] =>
  node == null || typeof node === "boolean" ? []
  : typeof node === "string" || typeof node === "number" ? [String(node)]
  : Array.isArray(node) ? node.flatMap(texts)
  : texts((node as El).props?.children);

export function helpers(layout: ReturnType<typeof loadLayout>) {
  const render = (props: WidgetProps, family: string, colorScheme = "light") => layout(props, { widgetFamily: family, colorScheme });
  return {
    render,
    text: (props: WidgetProps, family: string) => texts(render(props, family)).join(" | "),
    all: (props: WidgetProps, family: string) => walk(render(props, family)),
    has: (props: WidgetProps, family: string, type: string, pred: (e: El) => boolean = () => true) =>
      walk(render(props, family)).some((e) => e.type === type && pred(e)),
  };
}

export const AT = Date.UTC(2026, 10, 9, 15, 0);
export const ok = (over: Partial<WidgetProps> = {}): WidgetProps => ({
  status: "ok", resolved: 3, total: 5, pendingCount: 3, pendingSince: "06:00",
  upcoming: [{ time: "12:00", item: "Losartana", patient: "Mel", at: AT }, { time: "18:00", item: "Insulina", patient: "Tom", at: AT + 6 * 3_600_000 }],
  ...over,
});
