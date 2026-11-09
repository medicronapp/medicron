import { Divider, Gauge, HStack, Image, Text, VStack, ZStack } from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  gaugeStyle,
  lineLimit,
  monospacedDigit,
  padding,
  tint,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import { PlatformColor } from "react-native";
import type { WidgetProps } from "@/lib/widget-data";

/**
 * Widget do Medicron (médio e tela de bloqueio): anel do dia, as 2 próximas doses e as pendentes. Roda isolado na
 * extensão do iOS: sem hooks, sem rede e sem acessar o app. Tudo que usa fica dentro da função ou vem por props (o app
 * calcula, ver `widget-data.ts`). Tipografia do sistema (estilos de texto, que acompanham o tamanho de texto do iPhone),
 * cores semânticas, SF Symbols, anel nativo e contagem regressiva calculada pelo sistema.
 */
const MedicronWidget = (props: WidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const family = environment.widgetFamily;
  const accent = environment.colorScheme === "dark" ? "#2dd4bf" : "#0f766e"; // verde da marca, mais claro no escuro
  const red = PlatformColor("systemRed");
  const secondary = foregroundStyle({ type: "hierarchical", style: "secondary" });
  const root = [containerBackground(PlatformColor("systemBackground"), "widget"), widgetURL("medicron://")];
  const plural = (n: number) => (n === 1 ? "1 pendente" : `${n} pendentes`);
  const next = props.upcoming[0];

  const message =
    props.status === "signedOut" ? "Entre no Medicron para ver suas doses"
    : props.status === "stale" ? "Abra o Medicron para atualizar"
    : props.status === "empty" ? "Sem doses hoje"
    : null;
  const allDone = props.status === "ok" && props.upcoming.length === 0 && props.pendingCount === 0;
  const fraction = props.total > 0 ? props.resolved / props.total : 0;

  // Anel do dia: o Gauge circular nativo, com o "feitas/total" no centro (arredondado, como Fitness e Saúde).
  const ring = (size: number, label: string, centerFont: ReturnType<typeof font>, caption: boolean) => (
    <ZStack modifiers={[frame({ width: size, height: size })]}>
      <Gauge
        value={fraction}
        modifiers={[gaugeStyle("circularCapacity"), tint(accent), frame({ width: size, height: size }), accessibilityLabel(`${props.resolved} de ${props.total} doses feitas hoje`)]}
      />
      <VStack spacing={0}>
        <Text modifiers={[centerFont]}>{label}</Text>
        {caption ? <Text modifiers={[font({ textStyle: "caption2" }), secondary]}>hoje</Text> : null}
      </VStack>
    </ZStack>
  );

  if (family === "accessoryInline") {
    const line = message ?? (allDone ? "Tudo em dia" : [next ? `${next.time} ${next.item}` : "Sem próximas", props.pendingCount > 0 ? `${props.pendingCount} pend.` : ""].filter(Boolean).join(" · "));
    return (
      <HStack spacing={4} modifiers={root}>
        <Image systemName="pills.fill" />
        <Text>{line}</Text>
      </HStack>
    );
  }

  if (family === "accessoryRectangular") {
    if (message || allDone) {
      return (
        <VStack alignment="leading" modifiers={root}>
          <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), lineLimit(2)]}>{message ?? "Tudo em dia"}</Text>
          {allDone ? <Text modifiers={[font({ textStyle: "caption" }), secondary]}>{`${props.resolved} de ${props.total} doses feitas`}</Text> : null}
        </VStack>
      );
    }
    return (
      <HStack spacing={8} modifiers={root}>
        {ring(40, String(props.resolved), font({ textStyle: "footnote", weight: "bold", design: "rounded" }), false)}
        <VStack alignment="leading" spacing={1}>
          <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), lineLimit(1)]}>{next ? `${next.time} ${next.item}` : "Sem próximas"}</Text>
          <Text modifiers={[font({ textStyle: "caption" }), secondary, lineLimit(1)]}>
            {`${next ? `${next.patient} · ` : ""}${props.pendingCount > 0 ? plural(props.pendingCount) : "sem pendências"}`}
          </Text>
        </VStack>
      </HStack>
    );
  }

  // Médio: anel do dia à esquerda; à direita as 2 próximas e o resumo de pendentes.
  if (message) {
    return (
      <HStack spacing={12} modifiers={[...root, padding({ all: 16 })]}>
        <Image systemName="pills.fill" modifiers={[font({ textStyle: "title2" }), foregroundStyle(accent)]} />
        <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" })]}>{message}</Text>
      </HStack>
    );
  }

  const row = (i: { time: string; item: string; patient: string; at: number }) => (
    <HStack key={`${i.at}-${i.item}`} spacing={10}>
      <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), monospacedDigit(), foregroundStyle(accent)]}>{i.time}</Text>
      <VStack alignment="leading" spacing={0}>
        <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), lineLimit(1)]}>{i.item}</Text>
        <HStack spacing={4}>
          <Text modifiers={[font({ textStyle: "caption" }), secondary, lineLimit(1)]}>{i.patient}</Text>
          <Text date={new Date(i.at)} dateStyle="relative" modifiers={[font({ textStyle: "caption" }), secondary, lineLimit(1)]} />
        </HStack>
      </VStack>
    </HStack>
  );

  return (
    <HStack spacing={16} modifiers={[...root, padding({ all: 16 })]}>
      {ring(78, `${props.resolved}/${props.total}`, font({ textStyle: "title2", weight: "bold", design: "rounded" }), true)}
      <VStack alignment="leading" spacing={6}>
        {allDone ? (
          <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" })]}>Tudo em dia</Text>
        ) : props.upcoming.length === 0 ? (
          <Text modifiers={[font({ textStyle: "subheadline" }), secondary]}>Nenhuma dose a seguir</Text>
        ) : (
          props.upcoming.map(row)
        )}
        <Divider />
        {props.pendingCount > 0 ? (
          <HStack spacing={6}>
            <Image systemName="exclamationmark.circle.fill" modifiers={[font({ textStyle: "footnote" }), foregroundStyle(red)]} />
            <Text modifiers={[font({ textStyle: "footnote", weight: "semibold" }), foregroundStyle(red)]}>{plural(props.pendingCount)}</Text>
            <Text modifiers={[font({ textStyle: "caption" }), secondary, lineLimit(1)]}>{`desde ${props.pendingSince}`}</Text>
          </HStack>
        ) : (
          <HStack spacing={6}>
            <Image systemName="checkmark.circle.fill" modifiers={[font({ textStyle: "footnote" }), foregroundStyle(accent)]} />
            <Text modifiers={[font({ textStyle: "footnote", weight: "semibold" }), secondary]}>Sem pendências</Text>
          </HStack>
        )}
      </VStack>
    </HStack>
  );
};

// Estado inicial (galeria de widgets, antes do app entregar dados): sem sessão, literal. Não pode importar valores do app:
// o registro de layouts do build avalia este arquivo e resolve imports do app como módulo vazio. Igual a `signedOutProps()`.
const INITIAL: WidgetProps = { status: "signedOut", resolved: 0, total: 0, upcoming: [], pendingCount: 0, pendingSince: "" };

export default createWidget("MedicronWidget", MedicronWidget, INITIAL);
