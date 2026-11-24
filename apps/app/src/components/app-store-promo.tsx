import { useState } from "react";
import { Linking, Platform, Pressable, View } from "react-native";
import { Smartphone, X } from "lucide-react-native";
import { APP_STORE_URL } from "@/lib/store-links";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

const DISMISSED_KEY = "medicron.promo.ios.dismissed";

/** Lê/grava a escolha no navegador; se o armazenamento estiver bloqueado, a escolha vale só nesta visita. */
const wasDismissed = (): boolean => {
  try { return globalThis.localStorage?.getItem(DISMISSED_KEY) === "1"; } catch { return false; }
};
const rememberDismissed = (): void => {
  try { globalThis.localStorage?.setItem(DISMISSED_KEY, "1"); } catch { /* sem armazenamento: some só nesta visita */ }
};

/** Sugere o app de iPhone. Só na versão web (no app nativo já se está nele) e some de vez quando a pessoa dispensa. */
export function AppStorePromo() {
  const [hidden, setHidden] = useState(() => Platform.OS !== "web" || wasDismissed());
  if (hidden) return null;
  return (
    <View testID="app-store-promo" className="gap-2 rounded-xl border border-border bg-card p-3">
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-row items-center gap-2">
          <Icon icon={Smartphone} color="brandInk" size={18} />
          <Text className="text-sm font-semibold">Medicron no iPhone</Text>
        </View>
        <Pressable
          accessibilityRole="button" accessibilityLabel="Dispensar sugestão do app"
          onPress={() => { rememberDismissed(); setHidden(true); }}
          className="-mr-2 -mt-2 size-11 items-center justify-center"
        >
          <Icon icon={X} color="muted" size={16} />
        </Pressable>
      </View>
      <Text className="text-xs text-muted-foreground">Receba os lembretes no celular na hora certa e veja as próximas doses nos widgets.</Text>
      <Pressable accessibilityRole="link" accessibilityLabel="Baixar na App Store" onPress={() => { void Linking.openURL(APP_STORE_URL); }} className="min-h-11 justify-center">
        <Text className="text-sm font-medium text-link underline">Baixar na App Store</Text>
      </Pressable>
    </View>
  );
}
