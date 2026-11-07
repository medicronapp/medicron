import { Pressable } from "react-native";
import { Text } from "@/components/ui/text";

/** "Primeira vez? Criar conta": frase em cinza com a ação em destaque; o alvo de toque tem 44 px. */
export function AuthLink({ lead, action, onPress }: { lead: string; action: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={action} onPress={onPress} className="min-h-11 items-center justify-center">
      <Text className="text-center text-sm text-muted-foreground">
        {lead} <Text className="text-sm font-medium text-link underline">{action}</Text>
      </Text>
    </Pressable>
  );
}
