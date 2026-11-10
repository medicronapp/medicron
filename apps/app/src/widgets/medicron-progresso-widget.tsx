import { Gauge, HStack, Image, Text, VStack } from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  containerBackground,
  font,
  foregroundStyle,
  gaugeStyle,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import { PlatformColor } from "react-native";
import type { WidgetProps } from "@/lib/widget-data";

/**
 * Widget "Progresso" da tela de bloqueio (retangular): a próxima dose e, embaixo, a barra do dia (o estilo de bateria e
 * Fitness da Apple) com as pendentes ao lado. A barra usa a largura toda, que um anel desperdiçaria. Roda isolado na
 * extensão do iOS: tudo que usa fica dentro da função ou vem por props (o app calcula, ver `widget-data.ts`).
 */
const MedicronProgressoWidget = (props: WidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const secondary = foregroundStyle({ type: "hierarchical", style: "secondary" });
  const root = [containerBackground(PlatformColor("systemBackground"), "widget"), widgetURL("medicron://")];
  const shrink = [lineLimit(1), minimumScaleFactor(0.75)]; // reduz até 75% (>= 11 pt) antes de cortar
  const next = props.upcoming[0];
  const fraction = props.total > 0 ? props.resolved / props.total : 0;

  const message =
    props.status === "signedOut" ? "Entre no Medicron para ver suas doses"
    : props.status === "stale" ? "Abra o Medicron para atualizar"
    : props.status === "empty" ? "Sem doses hoje"
    : null;
  const allDone = props.status === "ok" && props.upcoming.length === 0 && props.pendingCount === 0;

  if (message) {
    return (
      <VStack alignment="leading" modifiers={root}>
        <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), lineLimit(3), minimumScaleFactor(0.75)]}>{message}</Text>
      </VStack>
    );
  }

  // Linha da barra: [⚠ N pendentes] barra do dia "feitas/total". As pendentes só aparecem quando há.
  const barRow = (
    <HStack spacing={6}>
      {props.pendingCount > 0 ? (
        <HStack spacing={2}>
          <Image systemName="exclamationmark.circle.fill" modifiers={[font({ textStyle: "footnote" })]} />
          <Text modifiers={[font({ textStyle: "footnote", weight: "semibold" }), monospacedDigit()]}>{String(props.pendingCount)}</Text>
        </HStack>
      ) : null}
      <Gauge
        value={fraction}
        modifiers={[gaugeStyle("linearCapacity"), accessibilityLabel(`${props.resolved} de ${props.total} doses feitas hoje`)]}
      />
      <Text modifiers={[font({ textStyle: "caption2" }), monospacedDigit(), secondary]}>{`${props.resolved}/${props.total}`}</Text>
    </HStack>
  );

  return (
    <VStack alignment="leading" spacing={2} modifiers={root}>
      {allDone ? (
        <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), ...shrink]}>Tudo em dia</Text>
      ) : next ? (
        <>
          <Text modifiers={[font({ textStyle: "caption" }), monospacedDigit(), secondary, ...shrink]}>{`${next.time} · ${next.patient}`}</Text>
          <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), ...shrink]}>{next.item}</Text>
        </>
      ) : (
        <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), ...shrink]}>Nenhuma dose a seguir</Text>
      )}
      {barRow}
    </VStack>
  );
};

// Estado inicial (galeria, antes do app entregar dados): sem sessão, literal. Não pode importar valores do app (o registro
// de layouts do build resolve imports do app como módulo vazio). Igual a `signedOutProps()`.
const INITIAL: WidgetProps = { status: "signedOut", resolved: 0, total: 0, upcoming: [], pendingCount: 0, pendingSince: "" };

export default createWidget("MedicronProgressoWidget", MedicronProgressoWidget, INITIAL);
