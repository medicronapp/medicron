"use client";
import { useRouter } from "next/navigation";
import { Copy, Mail } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { inviteLink } from "@/lib/invites";
import { ConfirmAction } from "@/components/confirm-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function InvitationRow({ id, email }: { id: string; email: string }) {
  const router = useRouter();
  return (
    <li className="grid gap-2 py-3">
      <div className="flex items-center gap-2">
        <Mail aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm">{email}</span>
        <Badge variant="outline">Pendente</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(inviteLink(id, window.location.origin));
            toast.success("Link copiado");
          }}
        >
          <Copy aria-hidden /> Copiar link
        </Button>
        <ConfirmAction
          triggerLabel="Cancelar" triggerVariant="outline"
          title="Cancelar convite?"
          description={`O link enviado para ${email} deixará de funcionar.`}
          confirmLabel="Cancelar convite"
          action={async () => {
            const { error } = await authClient.organization.cancelInvitation({ invitationId: id });
            if (error) {
              toast.error("Não foi possível cancelar o convite.");
              return;
            }
            toast.success("Convite cancelado");
            router.refresh();
          }}
        />
      </div>
    </li>
  );
}
