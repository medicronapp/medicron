import { Gauge, HStack, Image, Text, VStack, ZStack } from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  gaugeStyle,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  tint,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import { PlatformColor } from "react-native";
import type { WidgetProps } from "@/lib/widget-data";

/**
 * Widget "Progresso" da tela de bloqueio (retangular): anel compacto do dia, com a contagem de pendentes no meio (o que pede
 * ação), e o texto à direita, que pode quebrar em 2 linhas em vez de cortar. Roda isolado na extensão do iOS: tudo que
 * usa fica dentro da função ou vem por props (o app calcula, ver `widget-data.ts`).
 */
const MedicronProgressoWidget = (props: WidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const secondary = { type: "hierarchical" as const, style: "secondary" as const };
  const root = [containerBackground(PlatformColor("systemBackground"), "widget"), widgetURL("medicron://")];
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

  // O estilo de anel do iOS (para a tela de bloqueio) já se desenha no tamanho certo para 44 pt.
  const ring = (center: React.ReactNode) => (
    <ZStack modifiers={[frame({ width: 44, height: 44 })]}>
      <Gauge
        value={fraction}
        modifiers={[gaugeStyle("circularCapacity"), tint("#2dd4bf"), frame({ width: 44, height: 44 }), accessibilityLabel(`${props.resolved} de ${props.total} doses feitas hoje`)]}
      />
      {center}
    </ZStack>
  );

  if (allDone) {
    return (
      <HStack spacing={8} modifiers={root}>
        {ring(<Text modifiers={[font({ textStyle: "footnote", weight: "bold", design: "rounded" })]}>{String(props.resolved)}</Text>)}
        <VStack alignment="leading" spacing={1}>
          <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), lineLimit(1), minimumScaleFactor(0.75)]}>Tudo em dia</Text>
          <Text modifiers={[font({ textStyle: "caption" }), foregroundStyle(secondary), lineLimit(1), minimumScaleFactor(0.75)]}>{`${props.resolved} de ${props.total} feitas`}</Text>
        </VStack>
      </HStack>
    );
  }

  return (
    <HStack spacing={8} modifiers={root}>
      {ring(
        props.pendingCount > 0 ? (
          <VStack spacing={0}>
            <Text modifiers={[font({ textStyle: "headline", weight: "bold", design: "rounded" })]}>{String(props.pendingCount)}</Text>
            <Text modifiers={[font({ textStyle: "caption2" }), foregroundStyle(secondary)]}>pend.</Text>
          </VStack>
        ) : (
          <Image systemName="checkmark" modifiers={[font({ textStyle: "headline", weight: "bold" })]} />
        ),
      )}
      <VStack alignment="leading" spacing={1}>
        {next ? (
          <>
            <Text modifiers={[font({ textStyle: "caption" }), monospacedDigit(), foregroundStyle(secondary), lineLimit(1), minimumScaleFactor(0.75)]}>{`${next.time} · ${next.patient}`}</Text>
            <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), lineLimit(2), minimumScaleFactor(0.75)]}>{next.item}</Text>
          </>
        ) : (
          <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), lineLimit(2), minimumScaleFactor(0.75)]}>Nenhuma dose a seguir</Text>
        )}
      </VStack>
    </HStack>
  );
};

// Estado inicial (galeria, antes do app entregar dados): sem sessão, literal. Não pode importar valores do app (o registro
// de layouts do build resolve imports do app como módulo vazio). Igual a `signedOutProps()`.
const INITIAL: WidgetProps = { status: "signedOut", resolved: 0, total: 0, upcoming: [], pendingCount: 0, pendingSince: "" };

export default createWidget("MedicronProgressoWidget", MedicronProgressoWidget, INITIAL);
