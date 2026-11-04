import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { assertMember, pickActiveOrg, type OrgRole } from "@/lib/tenancy";

export type OrgContext = { userId: string; orgId: string; role: OrgRole };

/** Contexto da conta ativa do usuário logado; redireciona se faltar login ou conta. */
export async function getOrgContext(): Promise<OrgContext> {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) redirect("/entrar");
  const active = session.session.activeOrganizationId ?? null;
  const orgs = await auth.api.listOrganizations({ headers: h });
  const orgId = pickActiveOrg(active, orgs.map((o) => o.id));
  if (!orgId) redirect("/nova-conta");
  if (orgId !== active) {
    await auth.api.setActiveOrganization({ headers: h, body: { organizationId: orgId } });
  }
  const role = await assertMember(getDb(), session.user.id, orgId);
  return { userId: session.user.id, orgId, role };
}
