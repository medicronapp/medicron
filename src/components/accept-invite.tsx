"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function AcceptInvite({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid gap-2">
      <Button
        className="h-11"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const { data, error } = await authClient.organization.acceptInvitation({ invitationId });
          if (error || !data) {
            setError("Não foi possível aceitar o convite (talvez já seja membro ou o convite seja de outro e-mail).");
            setBusy(false);
            return;
          }
          await authClient.organization.setActive({ organizationId: data.invitation.organizationId });
          router.push("/");
          router.refresh();
        }}
      >
        Aceitar convite
      </Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
