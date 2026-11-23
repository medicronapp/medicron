import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { authClient } from "@/lib/auth-client";
import { NETWORK_MESSAGE } from "@/lib/api/errors";
import { authFailureMessage } from "@/lib/auth-errors";
import { AuthLink } from "@/components/auth-link";
import { FormError } from "@/components/form-error";
import { FormHeader } from "@/components/form-header";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";

/** Pede o link para criar uma nova senha. A resposta é a mesma tenha a pessoa conta ou não (não revela quem está cadastrado). */
export default function EsqueciSenha() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const address = email.trim();
    if (loading || !address) return;
    setLoading(true);
    setError("");
    try {
      const { error: failure } = await authClient.requestPasswordReset({ email: address });
      if (failure) {
        setError(authFailureMessage(failure, "Não foi possível enviar o link. Tente de novo."));
        return;
      }
      setSentTo(address);
    } catch {
      setError(NETWORK_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  if (sentTo) {
    return (
      <View className="gap-6">
        <FormHeader title="Confira o seu e-mail" description={`Se houver uma conta com ${sentTo}, enviamos um link para criar uma nova senha.`} />
        <Text className="text-sm text-muted-foreground">O link vale por 1 hora. Se não chegar em alguns minutos, olhe também a caixa de spam.</Text>
        <AuthLink lead="Lembrou da senha?" action="Voltar para entrar" onPress={() => router.replace("/entrar" as never)} />
      </View>
    );
  }

  return (
    <View className="gap-6">
      <FormHeader title="Esqueci minha senha" description="Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha." />
      <View className="gap-4">
        <FormField label="E-mail">
          <Input value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" autoCapitalize="none" autoCorrect={false} returnKeyType="go" onSubmitEditing={submit} />
        </FormField>
        <FormError message={error} />
        <Button size="lg" loading={loading} onPress={submit} accessibilityLabel="Enviar link">
          {loading ? "Enviando…" : "Enviar link"}
        </Button>
      </View>
      <AuthLink lead="Lembrou da senha?" action="Voltar para entrar" onPress={() => router.replace("/entrar" as never)} />
    </View>
  );
}
