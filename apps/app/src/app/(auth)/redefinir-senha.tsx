import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { authClient } from "@/lib/auth-client";
import { NETWORK_MESSAGE } from "@/lib/api/errors";
import { authFailureMessage } from "@/lib/auth-errors";
import { AuthLink } from "@/components/auth-link";
import { FormError } from "@/components/form-error";
import { FormHeader } from "@/components/form-header";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { PasswordInput } from "@/components/ui/password-input";

const INVALID_LINK = "Este link venceu ou já foi usado. Peça um novo.";

/** Destino do link do e-mail (`/redefinir-senha?token=...`): escolhe a nova senha. O token vale 1 hora e uma vez só. */
export default function RedefinirSenha() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [repeatError, setRepeatError] = useState("");
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading) return;
    setError("");
    setFieldError("");
    setRepeatError("");
    if (!password || !repeat) return;
    if (password.length < 8) {
      setFieldError("A senha precisa ter no mínimo 8 caracteres.");
      return;
    }
    if (password !== repeat) {
      setRepeatError("As senhas não são iguais.");
      return;
    }
    setLoading(true);
    try {
      const { error: failure } = await authClient.resetPassword({ newPassword: password, token });
      if (failure) {
        if (failure.code === "INVALID_TOKEN") setInvalid(true);
        else setError(authFailureMessage(failure, "Não foi possível salvar a nova senha. Tente de novo."));
        return;
      }
      setDone(true);
    } catch {
      setError(NETWORK_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <View className="gap-6">
        <FormHeader title="Senha alterada" description="Senha alterada. Entre com a nova senha." />
        <Button size="lg" onPress={() => router.replace("/entrar" as never)} accessibilityLabel="Entrar">Entrar</Button>
      </View>
    );
  }

  if (!token || invalid) {
    return (
      <View className="gap-6">
        <FormHeader title="Link inválido" description={INVALID_LINK} />
        <AuthLink lead="Precisa de outro?" action="Pedir novo link" onPress={() => router.replace("/esqueci-senha" as never)} />
      </View>
    );
  }

  return (
    <View className="gap-6">
      <FormHeader title="Criar nova senha" description="Escolha uma senha que você ainda não usou aqui." />
      <View className="gap-4">
        <FormField label="Nova senha" hint="Mínimo de 8 caracteres." error={fieldError}>
          <PasswordInput value={password} onChangeText={setPassword} autoComplete="new-password" textContentType="newPassword" returnKeyType="next" />
        </FormField>
        <FormField label="Repetir a nova senha" error={repeatError}>
          <PasswordInput value={repeat} onChangeText={setRepeat} autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={submit} />
        </FormField>
        <FormError message={error} />
        <Button size="lg" loading={loading} onPress={submit} accessibilityLabel="Salvar nova senha">
          {loading ? "Salvando…" : "Salvar nova senha"}
        </Button>
      </View>
    </View>
  );
}
