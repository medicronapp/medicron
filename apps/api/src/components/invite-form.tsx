"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { inviteLink } from "@/lib/invites";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

export function InviteForm() {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    const f = new FormData(form);
    const { data, error } = await authClient.organization.inviteMember({
      email: String(f.get("email")).trim(),
      role: f.get("role") === "admin" ? "admin" : "member",
    });
    setBusy(false);
    if (error || !data) return toast.error(error?.message ?? "Não foi possível criar o convite.");
    setLink(inviteLink(data.id, window.location.origin));
    form.reset();
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={onSubmit} className="grid gap-4">
        <FormField label="E-mail da pessoa" htmlFor="invite-email">
          <Input id="invite-email" name="email" type="email" inputMode="email" required />
        </FormField>
        <FormField label="Papel" htmlFor="invite-role" hint="Administradores também podem convidar pessoas.">
          <NativeSelect id="invite-role" name="role" defaultValue="admin">
            <option value="admin">Administrador (gerencia tudo)</option>
            <option value="member">Membro</option>
          </NativeSelect>
        </FormField>
        <Button type="submit" size="lg" disabled={busy}>
          {busy && <Loader2 aria-hidden className="animate-spin" />}
          Gerar link de convite
        </Button>
      </form>
      {link && <CopyLink link={link} />}
    </div>
  );
}

export function CopyLink({ link }: { link: string }) {
  return (
    <div className="grid gap-2 rounded-xl bg-brand-soft p-3 text-brand-ink">
      <p className="text-sm font-medium">Convite criado. Envie este link para a pessoa:</p>
      <div className="flex gap-2">
        <Input readOnly value={link} aria-label="Link do convite" className="bg-background text-foreground" onFocus={(e) => e.currentTarget.select()} />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Copiar link do convite"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            toast.success("Link copiado");
          }}
        >
          <Copy aria-hidden />
        </Button>
      </div>
    </div>
  );
}
