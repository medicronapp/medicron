import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getOrgContext } from "@/lib/session";
import { AppearanceCard } from "@/components/appearance-card";
import { EnableNotifications } from "@/components/enable-notifications";
import { InvitationRow } from "@/components/invitation-row";
import { InviteForm } from "@/components/invite-form";
import { MemberRow } from "@/components/member-row";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Page() {
  const { role } = await getOrgContext();
  const org = await auth.api.getFullOrganization({ headers: await headers() });
  const canInvite = role === "owner" || role === "admin";
  const pending = (org?.invitations ?? []).filter((i) => i.status === "pending");

  return (
    <div className="grid gap-5">
      <PageHeader title={org?.name ?? "Conta"} description="Pessoas, convites e preferências desta conta." />

      <EnableNotifications />

      <Card>
        <CardHeader>
          <CardTitle>Pessoas nesta conta</CardTitle>
          <CardDescription>Todas veem e registram os mesmos cuidados.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {org?.members.map((m) => (
              <MemberRow key={m.id} name={m.user.name} email={m.user.email} role={m.role} />
            ))}
          </ul>
        </CardContent>
      </Card>

      {canInvite && (
        <Card>
          <CardHeader>
            <CardTitle>Convidar alguém</CardTitle>
            <CardDescription>Gere um link e envie por mensagem. Vale por 7 dias.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <InviteForm />
            {pending.length > 0 && (
              <div>
                <h3 className="mb-1 text-sm font-semibold">Convites pendentes</h3>
                <ul className="divide-y">
                  {pending.map((i) => <InvitationRow key={i.id} id={i.id} email={i.email} />)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
        </CardHeader>
        <CardContent>
          <AppearanceCard />
        </CardContent>
      </Card>
    </div>
  );
}
