import { and, count, eq, isNull } from "drizzle-orm";
import { dayKey, historyCutoffKey, limitsFor, type SubscriptionDto, type Tier } from "@medicron/shared";
import type { Db } from "@/lib/db";
import { member, orgSubscriptions, patients } from "@/lib/db/schema";
import { ApiError } from "@/lib/api/errors";

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

const planLimit = (limit: "patients" | "members" | "history", message: string) => new ApiError(402, "plan_limit", message, { limit });

/** Criar paciente novo respeita o limite do plano. O que já existe nunca é tirado: só o **novo** é barrado. */
export async function assertCanCreatePatient(db: Db, orgId: string, now: Date): Promise<void> {
  const { limits, usage } = await getSubscription(db, orgId, now);
  if (limits.patients !== null && usage.patients >= limits.patients) {
    throw planLimit("patients", `Você chegou ao limite de ${limits.patients} pacientes do plano grátis. Com o Medicron Plus você cadastra quantos precisar.`);
  }
}

/** Ver um dia mais antigo que o histórico do plano. Hoje e os últimos dias nunca são barrados. */
export async function assertCanViewDay(db: Db, orgId: string, day: string, now: Date): Promise<void> {
  const { tier, limits } = await getSubscription(db, orgId, now);
  const cutoff = historyCutoffKey(dayKey(now), tier);
  if (cutoff !== null && day < cutoff) {
    throw planLimit("history", `O plano grátis mostra os últimos ${limits.historyDays} dias. Com o Medicron Plus você vê todo o histórico.`);
  }
}
