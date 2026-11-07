import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { safeNext } from "@medicron/shared";
import { authClient } from "@/lib/auth-client";
import { NETWORK_MESSAGE } from "@/lib/api/errors";
import { AuthLink } from "@/components/auth-link";
import { FormError } from "@/components/form-error";
import { FormHeader } from "@/components/form-header";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

export default function Entrar() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading || !email.trim() || !password) return;
    setLoading(true);
    setError("");
    try {
      const { error: failure } = await authClient.signIn.email({ email: email.trim(), password });
      if (failure) {
        setError("E-mail ou senha incorretos.");
        return;
      }
      router.replace(next as never);
    } catch {
      setError(NETWORK_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="gap-6">
      <FormHeader title="Entrar" description="Acesse sua conta para ver os cuidados de hoje." />
      <View className="gap-4">
        <FormField label="E-mail">
          <Input value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" autoCapitalize="none" autoCorrect={false} returnKeyType="next" />
        </FormField>
        <FormField label="Senha">
          <PasswordInput value={password} onChangeText={setPassword} autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={submit} />
        </FormField>
        <FormError message={error} />
        <Button size="lg" loading={loading} onPress={submit} accessibilityLabel="Entrar">
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </View>
      <AuthLink lead="Primeira vez?" action="Criar conta" onPress={() => router.replace(`/cadastrar?next=${encodeURIComponent(next)}` as never)} />
    </View>
  );
}
