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
  minimumScaleFactor,
  padding,
  scaleEffect,
  tint,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import { PlatformColor } from "react-native";
import type { WidgetProps } from "@/lib/widget-data";

/**
 * Widget do Medicron (médio): anel do dia, as 2 próximas doses e as pendentes. Roda isolado na
 * extensão do iOS: sem hooks, sem rede e sem acessar o app. Tudo que usa fica dentro da função ou vem por props (o app
 * calcula, ver `widget-data.ts`). Tipografia do sistema (estilos de texto, que acompanham o tamanho de texto do iPhone),
 * cores semânticas, SF Symbols, anel nativo e contagem regressiva calculada pelo sistema.
 */
const MedicronWidget = (props: WidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const accent = environment.colorScheme === "dark" ? "#2dd4bf" : "#0f766e"; // verde da marca, mais claro no escuro
  const red = PlatformColor("systemRed");
  const secondary = foregroundStyle({ type: "hierarchical", style: "secondary" });
  const root = [containerBackground(PlatformColor("systemBackground"), "widget"), widgetURL("medicron://")];
  const plural = (n: number) => (n === 1 ? "1 pendente" : `${n} pendentes`);

  const message =
    props.status === "signedOut" ? "Entre no Medicron para ver suas doses"
    : props.status === "stale" ? "Abra o Medicron para atualizar"
    : props.status === "empty" ? "Sem doses hoje"
    : null;
  const allDone = props.status === "ok" && props.upcoming.length === 0 && props.pendingCount === 0;
  const fraction = props.total > 0 ? props.resolved / props.total : 0;

  // Anel do dia: o Gauge circular nativo. O estilo do iOS é pensado para a tela de bloqueio e se desenha pequeno (~52 pt)
  // mesmo num frame maior; por isso a medida do anel é `scale` vezes o frame do Gauge, e o espaço reservado no layout
  // (`size`) acompanha. O miolo tem o número feito grande e "de N" pequeno, que cabem dentro do traço.
  const ring = (size: number, scale: number, numeral: ReturnType<typeof font>) => {
    const base = size / scale;
    return (
      <ZStack modifiers={[frame({ width: size, height: size })]}>
        <Gauge
          value={fraction}
          modifiers={[gaugeStyle("circularCapacity"), tint(accent), frame({ width: base, height: base }), scaleEffect(scale), accessibilityLabel(`${props.resolved} de ${props.total} doses feitas hoje`)]}
        />
        <VStack spacing={0}>
          <Text modifiers={[numeral, minimumScaleFactor(0.6), lineLimit(1)]}>{String(props.resolved)}</Text>
          <Text modifiers={[font({ textStyle: "caption2" }), secondary, lineLimit(1)]}>{`de ${props.total}`}</Text>
        </VStack>
      </ZStack>
    );
  };

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
      <Text modifiers={[font({ textStyle: "headline" }), monospacedDigit(), foregroundStyle(accent)]}>{i.time}</Text>
      <VStack alignment="leading" spacing={1}>
        <Text modifiers={[font({ textStyle: "headline" }), lineLimit(1), minimumScaleFactor(0.8)]}>{i.item}</Text>
        <HStack spacing={4}>
          <Text modifiers={[font({ textStyle: "subheadline" }), secondary, lineLimit(1), minimumScaleFactor(0.8)]}>{i.patient}</Text>
          <Text date={new Date(i.at)} dateStyle="relative" modifiers={[font({ textStyle: "subheadline" }), secondary, lineLimit(1), minimumScaleFactor(0.8)]} />
        </HStack>
      </VStack>
    </HStack>
  );

  return (
    <HStack spacing={14} modifiers={[...root, padding({ all: 16 })]}>
      {ring(102, 1.95, font({ textStyle: "title", weight: "bold", design: "rounded" }))}
      <VStack alignment="leading" spacing={8}>
        {allDone ? (
          <Text modifiers={[font({ textStyle: "headline" })]}>Tudo em dia</Text>
        ) : props.upcoming.length === 0 ? (
          <Text modifiers={[font({ textStyle: "headline" }), secondary]}>Nenhuma dose a seguir</Text>
        ) : (
          props.upcoming.map(row)
        )}
        <Divider />
        {props.pendingCount > 0 ? (
          <HStack spacing={6}>
            <Image systemName="exclamationmark.circle.fill" modifiers={[font({ textStyle: "subheadline" }), foregroundStyle(red)]} />
            <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), foregroundStyle(red), lineLimit(1), minimumScaleFactor(0.8)]}>{plural(props.pendingCount)}</Text>
            <Text modifiers={[font({ textStyle: "caption" }), secondary, lineLimit(1), minimumScaleFactor(0.8)]}>{`desde ${props.pendingSince}`}</Text>
          </HStack>
        ) : (
          <HStack spacing={6}>
            <Image systemName="checkmark.circle.fill" modifiers={[font({ textStyle: "subheadline" }), foregroundStyle(accent)]} />
            <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), secondary]}>Sem pendências</Text>
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
