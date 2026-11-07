import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MailX, UsersRound } from "lucide-react";
import { auth } from "@/lib/auth";
import { AcceptInvite } from "@/components/accept-invite";
import { BrandMark } from "@/components/brand-mark";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) redirect(`/cadastrar?next=${encodeURIComponent(`/convite/${id}`)}`);

  const invitation = await auth.api.getInvitation({ headers: h, query: { id } }).catch(() => null);
  const invalid = !invitation || invitation.status !== "pending";

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-sm gap-6 rounded-2xl border bg-card p-6 text-center shadow-sm">
        <BrandMark className="mx-auto size-12 rounded-2xl [&_svg]:size-6" />
        {invalid ? (
          <>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <MailX aria-hidden className="size-6" />
            </div>
            <div className="grid gap-1.5">
              <h1>Convite indisponível</h1>
              <p className="text-sm text-muted-foreground">
                Este convite expirou, foi cancelado, já foi usado ou é para outro e-mail. Peça um novo link a quem convidou.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
              <UsersRound aria-hidden className="size-6" />
            </div>
            <div className="grid gap-1.5">
              <h1 className="text-balance">Entrar em {invitation.organizationName}</h1>
              <p className="text-sm text-muted-foreground">
                <span className="break-all">{invitation.inviterEmail}</span> convidou você para cuidar dos pacientes juntos.
              </p>
            </div>
            <AcceptInvite invitationId={id} />
          </>
        )}
      </div>
    </main>
  );
}
