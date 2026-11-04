import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AcceptInvite } from "@/components/accept-invite";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) redirect(`/cadastrar?next=${encodeURIComponent(`/convite/${id}`)}`);

  const invitation = await auth.api
    .getInvitation({ headers: h, query: { id } })
    .catch(() => null);

  const invalid = !invitation || invitation.status !== "pending";
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-4 text-center">
      <div className="text-4xl">🐱</div>
      {invalid ? (
        <>
          <h1 className="text-xl font-semibold">Convite indisponível</h1>
          <p className="text-sm text-muted-foreground">
            Este convite expirou, foi cancelado, já foi usado ou é para outro e-mail.
            Peça um novo link a quem convidou.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold">Entrar em {invitation.organizationName}</h1>
          <p className="text-sm text-muted-foreground">
            {invitation.inviterEmail} convidou você para cuidar dos gatos juntos.
          </p>
          <AcceptInvite invitationId={id} />
        </>
      )}
    </main>
  );
}
