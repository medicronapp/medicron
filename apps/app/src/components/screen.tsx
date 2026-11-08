import type { ReactNode } from "react";
import { RefreshControl, ScrollView } from "react-native";

type Props = { children: ReactNode; onRefresh?: () => void; refreshing?: boolean; testID?: string };

/** Corpo rolável de uma tela logada: espaçamento do site (`grid gap-6`) e, se pedido, puxar para atualizar. */
export function Screen({ children, onRefresh, refreshing = false, testID }: Props) {
  return (
    <ScrollView
      testID={testID}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: 24, paddingBottom: 16 }}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}
