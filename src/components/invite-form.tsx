"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { inviteLink } from "@/lib/invites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <div className="grid gap-3">
      <form onSubmit={onSubmit} className="grid gap-3">
        <div className="grid gap-2">
          <Label htmlFor="email">E-mail da pessoa</Label>
          <Input id="email" name="email" type="email" required className="h-11" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="role">Papel</Label>
          <select id="role" name="role" className="h-11 rounded-md border bg-background px-2">
            <option value="admin">Administrador (gerencia tudo)</option>
            <option value="member">Membro</option>
          </select>
        </div>
        <Button type="submit" disabled={busy} className="h-11">Gerar link de convite</Button>
      </form>
      {link && <CopyLink link={link} />}
    </div>
  );
}

export function CopyLink({ link }: { link: string }) {
  return (
    <div className="flex gap-2">
      <Input readOnly value={link} className="h-11" onFocus={(e) => e.currentTarget.select()} />
      <Button
        type="button"
        variant="secondary"
        className="h-11"
        onClick={async () => {
          await navigator.clipboard.writeText(link);
          toast.success("Link copiado");
        }}
      >
        Copiar
      </Button>
    </div>
  );
}
