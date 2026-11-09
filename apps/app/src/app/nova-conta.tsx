import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { orgSlug } from "@medicron/shared";
import { authClient } from "@/lib/auth-client";
import { useAppSession } from "@/lib/session";
import { DeleteAccount } from "@/components/delete-account";
import { resetAccountData } from "@/lib/api/query";
import { NETWORK_MESSAGE } from "@/lib/api/errors";
import { AuthShell } from "@/components/auth-shell";
import { FormError } from "@/components/form-error";
import { FormHeader } from "@/components/form-header";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

export default function NovaConta() {
  const router = useRouter();
  const { signOut } = useAppSession();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const trimmed = name.trim();
    if (loading || !trimmed) return;
    setLoading(true);
    setError("");
    try {
      const { data, error: failure } = await authClient.organization.create({ name: trimmed, slug: orgSlug(trimmed) });
      if (failure || !data) {
        setError("Não foi possível criar a conta.");
        return;
      }
      await authClient.organization.setActive({ organizationId: data.id });
      await resetAccountData(); // o cabeçalho e as telas passam a ser da conta nova, sem dados da anterior
      router.replace("/");
    } catch {
      setError(NETWORK_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <View className="gap-6">
        <FormHeader title="Nova conta" description="Cada conta tem seus próprios pacientes, itens e pessoas. Use uma para cada casa ou família." />
        <View className="gap-4">
          <FormField label="Nome da conta" hint="Ex.: Casa da vovó">
            <Input value={name} onChangeText={setName} maxLength={60} returnKeyType="go" onSubmitEditing={submit} />
          </FormField>
          <FormError message={error} />
          <Button size="lg" loading={loading} onPress={submit} accessibilityLabel="Criar conta">Criar conta</Button>
        </View>
        <View className="gap-4">
          <Button variant="outline" onPress={() => void signOut()} accessibilityLabel="Sair">Sair</Button>
          <DeleteAccount />
        </View>
      </View>
    </AuthShell>
  );
}
