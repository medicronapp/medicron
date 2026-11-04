import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getOrgContext } from "@/lib/session";
import { InviteForm } from "@/components/invite-form";
import { InvitationRow } from "@/components/invitation-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ROLE: Record<string, string> = { owner: "Dono", admin: "Administrador", member: "Membro" };

export default async function Page() {
  const { role } = await getOrgContext();
  const org = await auth.api.getFullOrganization({ headers: await headers() });
  const canInvite = role === "owner" || role === "admin";
  const pending = (org?.invitations ?? []).filter((i) => i.status === "pending");

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">{org?.name}</h1>
      <Card>
        <CardHeader><CardTitle>Pessoas nesta conta</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y">
            {org?.members.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                <span>{m.user.name} <span className="text-muted-foreground">({m.user.email})</span></span>
                <span className="text-muted-foreground">{ROLE[m.role] ?? m.role}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      {canInvite && (
        <Card>
          <CardHeader><CardTitle>Convidar alguém</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <InviteForm />
            {pending.length > 0 && (
              <div>
                <h3 className="mb-1 text-sm font-medium">Convites pendentes</h3>
                <ul className="divide-y">
                  {pending.map((i) => <InvitationRow key={i.id} id={i.id} email={i.email} />)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
