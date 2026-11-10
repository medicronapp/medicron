import { useRef, useState } from "react";
import { View } from "react-native";
import { inviteLink } from "@medicron/shared";
import { inviteBase } from "@/lib/api-url";
import { useRouter } from "expo-router";
import { errorMessage } from "@/lib/api/errors";
import { isPlanLimit } from "@/lib/plan-limit";
import { inviteMember } from "@/lib/org";
import { CopyLink } from "@/components/copy-link";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { toast } from "@/components/ui/toast";

const EMAIL = /^\S+@\S+\.\S+$/;
const ROLES = [
  { value: "admin", label: "Administrador (gerencia tudo)" },
  { value: "member", label: "Membro" },
];

/** Gera um convite por e-mail e mostra o link para enviar. */
export function InviteForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("admin");
  const [emailError, setEmailError] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const sending = useRef(false); // dois toques seguidos geram um convite só

  async function submit() {
    if (sending.current) return;
    const trimmed = email.trim();
    setEmailError(EMAIL.test(trimmed) ? "" : "Informe um e-mail válido");
    if (!EMAIL.test(trimmed)) return;
    sending.current = true;
    setBusy(true);
    try {
      const { id } = await inviteMember(trimmed, role);
      setLink(inviteLink(id, inviteBase()));
      setEmail("");
    } catch (err) {
      const limit = isPlanLimit(err);
      if (limit) router.push(`/plus?motivo=${limit.limit}` as never);
      else toast.error(errorMessage(err));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <View className="gap-4">
      <FormField label="E-mail da pessoa" error={emailError}>
        <Input value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" autoCapitalize="none" autoCorrect={false} />
      </FormField>
      <FormField label="Papel" hint="Administradores também podem convidar pessoas.">
        <SelectField value={role} onChange={(v) => setRole(v as "admin" | "member")} options={ROLES} />
      </FormField>
      <Button size="lg" loading={busy} onPress={() => void submit()} accessibilityLabel="Gerar link de convite">Gerar link de convite</Button>
      {link ? <CopyLink link={link} /> : null}
    </View>
  );
}
