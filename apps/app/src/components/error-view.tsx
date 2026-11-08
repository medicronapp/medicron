import { View } from "react-native";
import { TriangleAlert } from "lucide-react-native";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

/** Conteúdo padrão de erro de tela: título, mensagem em português e "Tentar de novo". */
export function ErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="gap-4">
      <Text accessibilityRole="header" className="text-2xl font-semibold tracking-tight">Algo deu errado</Text>
      <Alert variant="destructive" icon={TriangleAlert}>
        <AlertDescription>Não foi possível carregar esta tela. Tente novamente em instantes.</AlertDescription>
      </Alert>
      <View className="flex-row gap-2">
        <Button onPress={onRetry}>Tentar de novo</Button>
      </View>
    </View>
  );
}
