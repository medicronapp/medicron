"use client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { inviteLink } from "@/lib/invites";
import { Button } from "@/components/ui/button";

export function InvitationRow({ id, email }: { id: string; email: string }) {
  const router = useRouter();
  return (
    <li className="flex items-center justify-between gap-2 py-2">
      <span className="truncate text-sm">{email}</span>
      <span className="flex gap-2">
        <Button
          size="sm" variant="secondary" className="h-10"
          onClick={async () => {
            await navigator.clipboard.writeText(inviteLink(id, window.location.origin));
            toast.success("Link copiado");
          }}
        >
          Copiar link
        </Button>
        <Button
          size="sm" variant="outline" className="h-10"
          onClick={async () => {
            await authClient.organization.cancelInvitation({ invitationId: id });
            router.refresh();
          }}
        >
          Cancelar
        </Button>
      </span>
    </li>
  );
}
