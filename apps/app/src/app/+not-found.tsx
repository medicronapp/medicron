import { Link } from "expo-router";
import { SearchX } from "lucide-react-native";
import { View } from "react-native";
import { EmptyState } from "@/components/empty-state";
import { Screen } from "@/components/screen";
import { buttonLabel } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

/** Rota inexistente (inclui links antigos): mensagem em português e volta ao início. */
export default function NotFound() {
  return (
    <Screen>
      <View className="flex-1 justify-center">
        <EmptyState
          icon={SearchX}
          title="Página não encontrada"
          description="O endereço não existe ou o item foi arquivado."
          action={
            <Link href="/" accessibilityRole="link" accessibilityLabel="Ir para o início">
              <Text className={buttonLabel("default", "default")}>Ir para o início</Text>
            </Link>
          }
        />
      </View>
    </Screen>
  );
}
