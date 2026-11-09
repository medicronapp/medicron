import { useRouter } from "expo-router";
import { SearchX } from "lucide-react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

/** Rota inexistente (inclui links antigos): mensagem em português e volta ao início. Fica fora da casca do app: cuida da área segura. */
export default function NotFound() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View testID="not-found" className="flex-1 justify-center bg-background px-4" style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
      <EmptyState
        icon={SearchX}
        title="Página não encontrada"
        description="O endereço não existe ou o link é antigo."
        action={<Button accessibilityLabel="Ir para o início" onPress={() => router.replace("/")}>Ir para o início</Button>}
      />
    </View>
  );
}
