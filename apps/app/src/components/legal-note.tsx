import { Linking, Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";

/** Política de privacidade (a mesma informada nas fichas das lojas). */
export const PRIVACY_URL = "https://medicron.com.br/privacidade";

/** Mesmo texto do rodapé do hotsite e das fichas das lojas: o app não é dispositivo médico. */
export const MEDICAL_DISCLAIMER =
  "O Medicron é um organizador de lembretes. Não faz diagnóstico nem indica doses ou tratamentos: siga a orientação do seu médico ou veterinário.";

/**
 * Aviso de que o app não é dispositivo médico e link para a política de privacidade. A App Store exige o link dentro do
 * app (diretriz 5.1.1) e, para apps de saúde, recomenda deixar claro o que o app não faz (1.4.1). Fica nas telas de acesso e na Conta.
 */
export function LegalNote() {
  return (
    <View className="items-center gap-1">
      <Text className="text-center text-xs leading-5 text-muted-foreground">{MEDICAL_DISCLAIMER}</Text>
      <Pressable accessibilityRole="link" accessibilityLabel="Política de privacidade" onPress={() => { void Linking.openURL(PRIVACY_URL); }} className="min-h-11 items-center justify-center">
        <Text className="text-xs font-medium text-link underline">Política de privacidade</Text>
      </Pressable>
    </View>
  );
}
