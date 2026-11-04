"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function AcceptInvite({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid gap-3">
      <Button
        size="lg"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          const { data, error } = await authClient.organization.acceptInvitation({ invitationId });
          if (error || !data) {
            setError("Não foi possível aceitar o convite (talvez você já seja membro ou o convite seja de outro e-mail).");
            setBusy(false);
            return;
          }
          await authClient.organization.setActive({ organizationId: data.invitation.organizationId });
          router.push("/");
          router.refresh();
        }}
      >
        {busy && <Loader2 aria-hidden className="animate-spin" />}
        Aceitar convite
      </Button>
      {error && (
        <Alert variant="destructive" className="text-left">
          <TriangleAlert aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
