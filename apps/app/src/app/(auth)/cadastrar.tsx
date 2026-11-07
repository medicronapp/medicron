import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { orgSlug, safeNext } from "@medicron/shared";
import { authClient } from "@/lib/auth-client";
import { NETWORK_MESSAGE } from "@/lib/api/errors";
import { authFailureMessage } from "@/lib/auth-errors";
import { AuthLink } from "@/components/auth-link";
import { FormError } from "@/components/form-error";
import { FormHeader } from "@/components/form-header";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

export default function Cadastrar() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading) return;
    setError("");
    setFieldError("");
    const trimmed = name.trim();
    if (!trimmed || !email.trim() || !password) return;
    if (password.length < 8) {
      setFieldError("A senha precisa ter no mínimo 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const { error: failure } = await authClient.signUp.email({ name: trimmed, email: email.trim(), password });
      if (failure) {
        setError(authFailureMessage(failure, failure.message ?? "Não foi possível criar a conta."));
        return;
      }
      // Quem veio por convite entra na conta convidada; os demais ganham uma conta própria.
      if (!next.startsWith("/convite/")) {
        const orgName = `Casa de ${trimmed.split(" ")[0]}`;
        const created = await authClient.organization.create({ name: orgName, slug: orgSlug(orgName) });
        if (created.error) {
          setError("Conta criada, mas não foi possível criar sua casa. Tente em Nova conta.");
          return;
        }
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
      <FormHeader title="Criar conta" description="Leva menos de um minuto. Depois é só cadastrar seus pacientes." />
      <View className="gap-4">
        <FormField label="Seu nome">
          <Input value={name} onChangeText={setName} autoComplete="name" textContentType="name" autoCapitalize="words" returnKeyType="next" />
        </FormField>
        <FormField label="E-mail">
          <Input value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" autoCapitalize="none" autoCorrect={false} returnKeyType="next" />
        </FormField>
        <FormField label="Senha" hint="Mínimo de 8 caracteres." error={fieldError}>
          <PasswordInput value={password} onChangeText={setPassword} autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={submit} />
        </FormField>
        <FormError message={error} />
        <Button size="lg" loading={loading} onPress={submit} accessibilityLabel="Criar conta">
          {loading ? "Criando…" : "Criar conta"}
        </Button>
      </View>
      <AuthLink lead="Já tem conta?" action="Entrar" onPress={() => router.replace(`/entrar?next=${encodeURIComponent(next)}` as never)} />
    </View>
  );
}
