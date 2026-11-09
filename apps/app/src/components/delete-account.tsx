import { useRef, useState } from "react";
import { View } from "react-native";
import { authClient } from "@/lib/auth-client";
import { NETWORK_MESSAGE } from "@/lib/api/errors";
import { queryClient } from "@/lib/api/query";
import { unregisterThisDevice } from "@/lib/push";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { FormField } from "@/components/ui/form-field";
import { PasswordInput } from "@/components/ui/password-input";

const DESCRIPTION =
  "Apaga o seu acesso e os seus dados. Se você for a única pessoa de uma conta, os pacientes, itens e rotinas dela também serão apagados. Isso não pode ser desfeito.";

/** Excluir a própria conta (exigido pelas lojas): confirma com a senha; ao concluir a sessão some e o app volta para Entrar. */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const working = useRef(false); // dois toques seguidos excluem uma vez só

  async function confirm() {
    if (working.current || !password) return;
    working.current = true;
    setBusy(true);
    setError("");
    try {
      const { error: failure } = await authClient.deleteUser({ password });
      if (failure) {
        setError(failure.code === "INVALID_PASSWORD" ? "Senha incorreta." : "Não foi possível excluir a conta. Tente de novo.");
        return;
      }
      // A conta já foi excluída (o servidor também apagou os aparelhos de push): limpa o que sobrou aqui.
      queryClient.clear();
      await unregisterThisDevice();
      setPassword("");
      setOpen(false);
    } catch {
      setError(NETWORK_MESSAGE);
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Excluir conta</CardTitle>
          <CardDescription>{DESCRIPTION}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" size="lg" onPress={() => setOpen(true)} accessibilityLabel="Excluir minha conta">Excluir minha conta</Button>
        </CardContent>
      </Card>
      <Drawer open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setPassword(""); setError(""); } }} title="Excluir sua conta?" description={DESCRIPTION}>
        <View className="gap-4">
          <FormField label="Senha" error={error}>
            <PasswordInput value={password} onChangeText={setPassword} autoComplete="current-password" textContentType="password" />
          </FormField>
          <View className="flex-row gap-2">
            <Button variant="outline" size="lg" className="flex-1" onPress={() => setOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive" size="lg" className="flex-1" loading={busy} disabled={!password} accessibilityLabel="Excluir conta"
              onPress={() => void confirm()}
            >
              Excluir conta
            </Button>
          </View>
        </View>
      </Drawer>
    </>
  );
}
