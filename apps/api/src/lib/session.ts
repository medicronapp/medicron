import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { assertMember, pickActiveOrg, type OrgRole } from "@/lib/tenancy";

export type OrgContext = { userId: string; orgId: string; role: OrgRole };

/** Resultado de resolver sessão e conta ativa, sem decidir o que fazer quando falta algo. */
export type OrgContextResult =
  | { ok: true; ctx: OrgContext }
  | { ok: false; reason: "no_session" | "no_organization" };

/** Sessão + conta ativa do usuário logado; quem chama decide se redireciona (telas) ou responde 401/403 (API). */
export async function loadOrgContext(): Promise<OrgContextResult> {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) return { ok: false, reason: "no_session" };
  const active = session.session.activeOrganizationId ?? null;
  const orgs = await auth.api.listOrganizations({ headers: h });
  const orgId = pickActiveOrg(active, orgs.map((o) => o.id));
  if (!orgId) return { ok: false, reason: "no_organization" };
  if (orgId !== active) {
    await auth.api.setActiveOrganization({ headers: h, body: { organizationId: orgId } });
  }
  const role = await assertMember(getDb(), session.user.id, orgId);
  return { ok: true, ctx: { userId: session.user.id, orgId, role } };
}

/** Contexto da conta ativa do usuário logado; redireciona se faltar login ou conta. */
export async function getOrgContext(): Promise<OrgContext> {
  const r = await loadOrgContext();
  if (r.ok) return r.ctx;
  redirect(r.reason === "no_session" ? "/entrar" : "/nova-conta");
}
