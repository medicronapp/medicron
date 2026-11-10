import { and, count, eq, isNull } from "drizzle-orm";
import { limitsFor, type SubscriptionDto, type Tier } from "@medicron/shared";
import type { Db } from "@/lib/db";
import { member, orgSubscriptions, patients } from "@/lib/db/schema";

type Source = "apple" | "google" | "manual";

/** Contagens que entram nos limites: pacientes **não arquivados** e pessoas (membros) da conta. */
async function usageOf(db: Db, orgId: string): Promise<{ patients: number; members: number }> {
  const [p] = await db.select({ n: count() }).from(patients).where(and(eq(patients.organizationId, orgId), isNull(patients.archivedAt)));
  const [m] = await db.select({ n: count() }).from(member).where(eq(member.organizationId, orgId));
  return { patients: Number(p?.n ?? 0), members: Number(m?.n ?? 0) };
}

/** Plano da conta agora: Plus só se `plus_until` ainda for futuro; senão grátis (sem apagar nada). */
export async function getSubscription(db: Db, orgId: string, now: Date): Promise<SubscriptionDto> {
  const [row] = await db.select().from(orgSubscriptions).where(eq(orgSubscriptions.organizationId, orgId)).limit(1);
  const tier: Tier = row?.plusUntil && row.plusUntil.getTime() > now.getTime() ? "plus" : "free";
  return {
    tier,
    plusUntil: tier === "plus" ? row!.plusUntil!.toISOString() : null,
    source: tier === "plus" ? (row!.source ?? null) : null,
    willRenew: tier === "plus" ? row!.willRenew : false,
    limits: limitsFor(tier),
    usage: await usageOf(db, orgId),
  };
}

/** Concede (ou renova) o Plus da conta até `until`. Uma linha por conta (upsert). */
export async function grantPlus(
  db: Db, orgId: string, until: Date, source: Source,
  opts: { productId?: string; willRenew?: boolean; eventMs?: number } = {},
): Promise<void> {
  const values = {
    organizationId: orgId, plusUntil: until, source, productId: opts.productId ?? null,
    willRenew: opts.willRenew ?? false, lastEventMs: opts.eventMs ?? 0, updatedAt: new Date(),
  };
  await db.insert(orgSubscriptions).values(values).onConflictDoUpdate({
    target: orgSubscriptions.organizationId,
    set: { plusUntil: values.plusUntil, source, productId: values.productId, willRenew: values.willRenew, lastEventMs: values.lastEventMs, updatedAt: values.updatedAt },
  });
}
