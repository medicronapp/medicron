import { useEffect } from "react";
import { Platform } from "react-native";
import { useCachedHome } from "@/lib/home-queries";
import { useAppSession } from "@/lib/session";
import { buildWidgetTimeline, signedOutProps } from "@/lib/widget-data";

type WidgetModule = { updateTimeline: (entries: { date: Date; props: unknown }[]) => void };

/** Os widgets do Medicron: médio, "Agora" e "Progresso" (tela de bloqueio). Todos recebem a mesma timeline. */
const WIDGET_FILES = ["medicron-widget", "medicron-agora-widget", "medicron-progresso-widget"] as const;

/** Os módulos dos widgets só existem no iOS: carrega sob demanda para Android e web nunca tocarem neles. */
function widgets(): WidgetModule[] {
  if (Platform.OS !== "ios") return [];
  const loaded: WidgetModule[] = [];
  const load: Record<(typeof WIDGET_FILES)[number], () => WidgetModule> = {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    "medicron-widget": () => require("@/widgets/medicron-widget").default,
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    "medicron-agora-widget": () => require("@/widgets/medicron-agora-widget").default,
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    "medicron-progresso-widget": () => require("@/widgets/medicron-progresso-widget").default,
  };
  for (const file of WIDGET_FILES) {
    try {
      loaded.push(load[file]());
    } catch (error) {
      console.warn(`[widget] módulo ${file} indisponível`, error);
    }
  }
  return loaded;
}

/** Entrega a mesma timeline a cada widget; a falha de um não impede os outros (o widget é cortesia, nunca quebra o app). */
function updateAll(entries: { date: Date; props: unknown }[]): void {
  for (const widget of widgets()) {
    try {
      widget.updateTimeline(entries);
    } catch (error) {
      console.warn("[widget] não foi possível atualizar um widget", error);
    }
  }
}

/** Esvazia os widgets (sair da conta, excluir a conta): nome de paciente ou remédio não pode ficar na tela. */
export function clearWidget(): void {
  updateAll([{ date: new Date(), props: signedOutProps() }]);
}

/**
 * Mantém o widget em dia com a tela Hoje: a cada dado novo no cache (abrir o app, dose registrada) entrega a timeline
 * do dia, sem fazer requisição própria; sem sessão, esvazia. O iOS só deixa o app atualizar o widget enquanto ele roda; entre aberturas, a timeline avança sozinha.
 */
export function useWidgetSync(): void {
  const { status } = useAppSession();
  const data = useCachedHome();
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    if (status === "signedOut") return clearWidget();
    if (status !== "signedIn" || !data) return;
    updateAll(buildWidgetTimeline(new Date(), data.home));
  }, [status, data]);
}
