import { and, eq } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { member } from "@/lib/db/schema";

export class Forbidden extends Error {
  constructor() {
    super("Acesso negado a esta conta");
  }
}

export type OrgRole = "owner" | "admin" | "member";

/** Devolve o papel do usuário na organização ou lança Forbidden. */
export async function assertMember(db: Db, userId: string, orgId: string): Promise<OrgRole> {
  const [row] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, orgId)))
    .limit(1);
  if (!row) throw new Forbidden();
  return row.role as OrgRole;
}

/** Mantém a conta ativa se o usuário ainda pertence a ela; senão usa a primeira disponível. */
export function pickActiveOrg(activeId: string | null, orgIds: string[]): string | null {
  if (activeId && orgIds.includes(activeId)) return activeId;
  return orgIds[0] ?? null;
}
