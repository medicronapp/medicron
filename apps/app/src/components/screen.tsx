import type { ReactNode } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useIsWide } from "@/lib/use-breakpoint";

type Props = { children: ReactNode; onRefresh?: () => void; refreshing?: boolean; testID?: string };

/**
 * Corpo rolável de uma tela logada. A rolagem vai de borda a borda (do cabeçalho até as abas), então o conteúdo
 * desliza por baixo deles; a folga (topo, base e laterais) fica dentro da rolagem. Largura máxima e espaçamento do site.
 */
export function Screen({ children, onRefresh, refreshing = false, testID }: Props) {
  const wide = useIsWide();
  return (
    <ScrollView
      testID={testID}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ alignItems: "center", paddingHorizontal: 16, paddingTop: 24, paddingBottom: wide ? 40 : 112 }}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
    >
      <View style={{ width: "100%", maxWidth: 768, gap: 24 }}>{children}</View>
    </ScrollView>
  );
}
