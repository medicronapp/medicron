import { asc, desc, eq, isNotNull, and } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { member, session, user } from "@/lib/db/schema";
import { grantPlus } from "@/lib/services/subscription";

const USAGE = "Uso: npm run grant-plus -- --email pessoa@exemplo.com --until AAAA-MM-DD";

/** Lê `--email` e `--until` (AAAA-MM-DD); a validade é o **fim do dia em Brasília** (23:59:59.999, UTC-3). */
export function parseGrantArgs(argv: string[], now: Date = new Date()): { email: string; until: Date } {
  const get = (flag: string) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined; };
  const email = get("--email")?.trim().toLowerCase();
  const date = get("--until")?.trim();
  if (!email) throw new Error(`Falta o --email. ${USAGE}`);
  if (!date) throw new Error(`Falta o --until. ${USAGE}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Data no formato AAAA-MM-DD (recebi "${date}"). ${USAGE}`);
  const until = new Date(`${date}T23:59:59.999-03:00`);
  // ida e volta em Brasília (UTC-3): 2027-02-31 vira 2027-03-03 e não confere
  if (Number.isNaN(until.getTime()) || new Date(until.getTime() - 3 * 3_600_000).toISOString().slice(0, 10) !== date) {
    throw new Error(`Data inválida: ${date}.`);
  }
  if (until.getTime() <= now.getTime()) throw new Error(`A data ${date} já está no passado.`);
  return { email, until };
}

/** Concede Plus manual à conta (organização) **ativa** da pessoa; sem sessão ativa, à primeira conta em que ela entrou. */
export async function grantPlusByEmail(db: Db, email: string, until: Date): Promise<{ orgId: string }> {
  const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, email.toLowerCase())).limit(1);
  if (!u) throw new Error(`Usuário não encontrado: ${email}`);
  const memberships = await db.select({ orgId: member.organizationId }).from(member).where(eq(member.userId, u.id)).orderBy(asc(member.createdAt));
  if (memberships.length === 0) throw new Error(`${email} não tem nenhuma conta (organização).`);
  const [active] = await db.select({ orgId: session.activeOrganizationId }).from(session)
    .where(and(eq(session.userId, u.id), isNotNull(session.activeOrganizationId))).orderBy(desc(session.updatedAt)).limit(1);
  const orgId = memberships.find((m) => m.orgId === active?.orgId)?.orgId ?? memberships[0].orgId;
  await grantPlus(db, orgId, until, "manual");
  return { orgId };
}
