import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Download } from "lucide-react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

/** Tela fixa: a API só aceita versões novas do app. Sem botão de tentar de novo, porque repetir não resolve. */
export function UpdateRequired({ minVersion }: { minVersion: string }) {
  const insets = useSafeAreaInsets(); // fora da casca do app: cuida sozinha da área segura
  return (
    <View testID="update-required" className="flex-1 items-center justify-center gap-3 bg-background px-8" style={{ paddingTop: insets.top }}>
      <View className="size-14 items-center justify-center rounded-full bg-brand-soft">
        <Icon icon={Download} color="brandInk" size={24} />
      </View>
      <Text accessibilityRole="header" className="text-center text-xl font-semibold">Atualize o app para continuar</Text>
      <Text className="text-center text-sm text-muted-foreground">
        Esta versão do Medicron não é mais aceita.{minVersion ? ` Instale a versão ${minVersion} ou mais nova na loja.` : " Instale a versão mais nova na loja."}
      </Text>
    </View>
  );
}
