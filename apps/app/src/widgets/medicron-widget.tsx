import { HStack, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import { containerBackground, font, foregroundStyle, lineLimit, padding } from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import { PlatformColor } from "react-native";
import type { WidgetProps } from "@/lib/widget-data";

/**
 * Widget de próximas doses e pendentes (médio e tela de bloqueio). Roda isolado na extensão do iOS: sem hooks, sem
 * rede e sem acessar o app. Tudo que usa fica dentro da função ou vem por props (o app calcula, ver `widget-data.ts`).
 */
const MedicronWidget = (props: WidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const family = environment.widgetFamily;
  const background = containerBackground(PlatformColor("systemBackground"), "widget");
  const secondary = foregroundStyle({ type: "hierarchical", style: "secondary" });
  const plural = (n: number) => (n === 1 ? "1 pendente" : `${n} pendentes`);

  const message =
    props.status === "signedOut" ? "Abra o Medicron para entrar"
    : props.status === "stale" ? "Abra o Medicron para atualizar"
    : props.status === "empty" ? "Sem doses hoje"
    : props.upcoming.length === 0 && props.pending.length === 0 ? "Tudo em dia"
    : null;

  if (family === "accessoryInline") {
    const next = props.upcoming[0];
    const line = message ?? [next ? `${next.time} ${next.item}` : "Sem próximas", props.pendingCount > 0 ? plural(props.pendingCount) : ""].filter(Boolean).join(" · ");
    return <Text modifiers={[background]}>{line}</Text>;
  }

  if (family === "accessoryRectangular") {
    const next = props.upcoming[0];
    return (
      <VStack alignment="leading" modifiers={[background]}>
        {message ? (
          <Text modifiers={[font({ size: 13, weight: "semibold" })]}>{message}</Text>
        ) : (
          <>
            <Text modifiers={[font({ size: 13, weight: "semibold" }), lineLimit(1)]}>{next ? `${next.time} · ${next.item}` : "Sem próximas"}</Text>
            <Text modifiers={[font({ size: 12 }), secondary]}>{props.pendingCount > 0 ? plural(props.pendingCount) : "Tudo em dia"}</Text>
          </>
        )}
      </VStack>
    );
  }

  // Médio: duas colunas, próximas à esquerda e pendentes à direita.
  const row = (time: string, item: string, patient: string | null, late: boolean) => (
    <HStack key={`${time}-${item}-${patient}`} spacing={6} alignment="firstTextBaseline">
      <Text modifiers={[font({ size: 13, weight: "bold", design: "monospaced" }), foregroundStyle(late ? "#dc2626" : "#0f766e")]}>{time}</Text>
      <VStack alignment="leading" spacing={0}>
        <Text modifiers={[font({ size: 13, weight: "medium" }), lineLimit(1)]}>{item}</Text>
        {patient ? <Text modifiers={[font({ size: 11 }), secondary, lineLimit(1)]}>{patient}</Text> : null}
      </VStack>
    </HStack>
  );
  const more = (n: number, label: string) => (n > 0 ? <Text modifiers={[font({ size: 11 }), secondary]}>{`+${n} ${label}`}</Text> : null);

  return (
    <VStack alignment="leading" spacing={8} modifiers={[background, padding({ all: 12 })]}>
      <HStack>
        <Text modifiers={[font({ size: 14, weight: "bold" }), foregroundStyle("#0f766e")]}>Medicron</Text>
        <Spacer />
        {props.updatedAt ? <Text modifiers={[font({ size: 10 }), secondary]}>{`Atualizado ${props.updatedAt}`}</Text> : null}
      </HStack>
      {message ? (
        <Text modifiers={[font({ size: 15, weight: "semibold" })]}>{message}</Text>
      ) : (
        <HStack alignment="top" spacing={16}>
          <VStack alignment="leading" spacing={4}>
            <Text modifiers={[font({ size: 10, weight: "semibold" }), secondary]}>Próximas</Text>
            {props.upcoming.length === 0 ? <Text modifiers={[font({ size: 12 }), secondary]}>Nenhuma a seguir</Text> : null}
            {props.upcoming.map((i) => row(i.time, i.item, i.patient, false))}
            {more(props.upcomingCount - props.upcoming.length, "a seguir")}
          </VStack>
          <VStack alignment="leading" spacing={4}>
            <Text modifiers={[font({ size: 10, weight: "semibold" }), secondary]}>Pendentes</Text>
            {props.pending.length === 0 ? <Text modifiers={[font({ size: 12 }), secondary]}>Nenhuma pendente</Text> : null}
            {props.pending.map((i) => row(i.time, i.item, null, i.late))}
            {more(props.pendingCount - props.pending.length, "pendentes")}
          </VStack>
        </HStack>
      )}
    </VStack>
  );
};

// Estado inicial (galeria de widgets, antes do app entregar dados): sem sessão, literal. Não pode importar valores do app:
// o registro de layouts do build avalia este arquivo e resolve imports do app como módulo vazio. Igual a `signedOutProps()`.
const INITIAL: WidgetProps = { status: "signedOut", upcoming: [], pending: [], upcomingCount: 0, pendingCount: 0, updatedAt: "" };

export default createWidget("MedicronWidget", MedicronWidget, INITIAL);
