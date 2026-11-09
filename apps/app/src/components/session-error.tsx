import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TriangleAlert } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

/** Falha ao carregar as contas (rede ou servidor): tela com saída, em vez de ficar em "carregando" para sempre. */
export function SessionError({ onRetry }: { onRetry: () => void }) {
  const insets = useSafeAreaInsets(); // fora da casca do app: cuida sozinha da área segura
  return (
    <View testID="session-error" className="flex-1 items-center justify-center gap-3 bg-background px-8" style={{ paddingTop: insets.top }}>
      <View className="size-14 items-center justify-center rounded-full bg-brand-soft">
        <Icon icon={TriangleAlert} color="brandInk" size={24} />
      </View>
      <Text accessibilityRole="header" className="text-center text-xl font-semibold">Não foi possível carregar suas contas</Text>
      <Text className="text-center text-sm text-muted-foreground">Verifique a internet e tente de novo.</Text>
      <Button onPress={onRetry}>Tentar de novo</Button>
    </View>
  );
}
