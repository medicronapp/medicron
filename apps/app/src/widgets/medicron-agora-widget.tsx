import { HStack, Image, Text, VStack } from "@expo/ui/swift-ui";
import {
  containerBackground,
  font,
  foregroundStyle,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import { PlatformColor } from "react-native";
import type { WidgetProps } from "@/lib/widget-data";

/**
 * Widget "Agora" da tela de bloqueio (retangular e em linha): três linhas que usam os 160 pt inteiros. Linha 1, o remédio
 * sozinho; linha 2, horário, paciente e a contagem do sistema; linha 3, as pendentes. Sem anel, para o texto não cortar.
 * Roda isolado na extensão do iOS: tudo que usa fica dentro da função ou vem por props (o app calcula, ver `widget-data.ts`).
 */
const MedicronAgoraWidget = (props: WidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const family = environment.widgetFamily;
  const secondary = foregroundStyle({ type: "hierarchical", style: "secondary" });
  const root = [containerBackground(PlatformColor("systemBackground"), "widget"), widgetURL("medicron://")];
  const shrink = [lineLimit(1), minimumScaleFactor(0.75)]; // reduz até 75% (>= 11 pt) antes de cortar
  const next = props.upcoming[0];

  const message =
    props.status === "signedOut" ? "Entre no Medicron para ver suas doses"
    : props.status === "stale" ? "Abra o Medicron para atualizar"
    : props.status === "empty" ? "Sem doses hoje"
    : null;
  const allDone = props.status === "ok" && props.upcoming.length === 0 && props.pendingCount === 0;
  const pending = `${props.pendingCount === 1 ? "1 pendente" : `${props.pendingCount} pendentes`} desde ${props.pendingSince}`;

  if (family === "accessoryInline") {
    const line = message ?? (allDone ? "Tudo em dia" : [next ? `${next.time} ${next.item}` : "Sem próximas", props.pendingCount > 0 ? `${props.pendingCount} pend.` : ""].filter(Boolean).join(" · "));
    return (
      <HStack spacing={4} modifiers={root}>
        <Image systemName="pills.fill" />
        <Text>{line}</Text>
      </HStack>
    );
  }

  if (message || allDone) {
    return (
      <VStack alignment="leading" spacing={1} modifiers={root}>
        <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), lineLimit(3), minimumScaleFactor(0.75)]}>{message ?? "Tudo em dia"}</Text>
        {allDone ? <Text modifiers={[font({ textStyle: "caption" }), secondary, ...shrink]}>{`${props.resolved} de ${props.total} doses feitas hoje`}</Text> : null}
      </VStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={1} modifiers={root}>
      <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), ...shrink]}>{next ? next.item : "Nenhuma dose a seguir"}</Text>
      {next ? (
        <HStack spacing={3}>
          <Text modifiers={[font({ textStyle: "caption" }), monospacedDigit(), ...shrink]}>{next.time}</Text>
          <Text modifiers={[font({ textStyle: "caption" }), secondary, ...shrink]}>{`· ${next.patient} ·`}</Text>
          <Text date={new Date(next.at)} dateStyle="relative" modifiers={[font({ textStyle: "caption" }), secondary, ...shrink]} />
        </HStack>
      ) : null}
      {props.pendingCount > 0 ? (
        <HStack spacing={4}>
          <Image systemName="exclamationmark.circle.fill" modifiers={[font({ textStyle: "footnote" })]} />
          <Text modifiers={[font({ textStyle: "footnote", weight: "semibold" }), ...shrink]}>{pending}</Text>
        </HStack>
      ) : (
        <HStack spacing={4}>
          <Image systemName="checkmark.circle.fill" modifiers={[font({ textStyle: "caption" }), secondary]} />
          <Text modifiers={[font({ textStyle: "caption" }), secondary, ...shrink]}>Sem pendências</Text>
        </HStack>
      )}
    </VStack>
  );
};

// Estado inicial (galeria, antes do app entregar dados): sem sessão, literal. Não pode importar valores do app (o registro
// de layouts do build resolve imports do app como módulo vazio). Igual a `signedOutProps()`.
const INITIAL: WidgetProps = { status: "signedOut", resolved: 0, total: 0, upcoming: [], pendingCount: 0, pendingSince: "" };

export default createWidget("MedicronAgoraWidget", MedicronAgoraWidget, INITIAL);
