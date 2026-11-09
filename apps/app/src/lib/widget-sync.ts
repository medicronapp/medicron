import { useEffect } from "react";
import { Platform } from "react-native";
import { useCachedHome } from "@/lib/home-queries";
import { useAppSession } from "@/lib/session";
import { buildWidgetTimeline, signedOutProps } from "@/lib/widget-data";

type WidgetModule = { updateTimeline: (entries: { date: Date; props: unknown }[]) => void };

/** O módulo do widget só existe no iOS: carrega sob demanda para Android e web nunca tocarem nele. */
function widget(): WidgetModule | null {
  if (Platform.OS !== "ios") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@/widgets/medicron-widget").default as WidgetModule;
  } catch (error) {
    console.warn("[widget] módulo do widget indisponível", error);
    return null;
  }
}

/** Esvazia o widget (sair da conta, excluir a conta): nome de paciente ou remédio não pode ficar na tela inicial. */
export function clearWidget(): void {
  try {
    widget()?.updateTimeline([{ date: new Date(), props: signedOutProps() }]);
  } catch (error) {
    // o widget é uma cortesia: nunca pode quebrar o app (mas o erro aparece no log do aparelho)
    console.warn("[widget] não foi possível limpar o widget", error);
  }
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
    try {
      widget()?.updateTimeline(buildWidgetTimeline(new Date(), data.home));
    } catch (error) {
      console.warn("[widget] não foi possível atualizar o widget", error);
    }
  }, [status, data]);
}
