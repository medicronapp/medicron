import { and, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { carePlans, items, member, patients, pushDevices, pushSubscriptions, userOnboarding } from "@/lib/db/schema";
import { getSubscription } from "@/lib/services/subscription";

export type ChecklistSteps = { patient: boolean; item: boolean; plan: boolean; push: boolean };
export type Onboarding = { showWelcome: boolean; welcomeOffer: boolean; checklist: { show: boolean; steps: ChecklistSteps } };

/**
 * Oferta de boas-vindas do Plus: só para quem pode assinar (dono ou admin), numa conta ainda no plano grátis, e só uma vez.
 * Quem já existia quando o recurso nasceu foi marcado como "já viu" na migração, então só contas novas chegam a ver.
 */
async function welcomeOfferFor(db: Db, userId: string, orgId: string, alreadySeen: boolean): Promise<boolean> {
  if (alreadySeen) return false;
  const [m] = await db.select({ role: member.role }).from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, orgId))).limit(1);
  if (!m || (m.role !== "owner" && m.role !== "admin")) return false;
  return (await getSubscription(db, orgId, new Date())).tier === "free";
}

const exists = async (q: Promise<{ n: number }[]>) => (await q)[0].n > 0;

/** O que mostrar de onboarding para o usuário nesta conta. Os passos vêm do uso real, não de marcações. */
export async function getOnboarding(db: Db, userId: string, orgId: string): Promise<Onboarding> {
  const [row] = await db.select().from(userOnboarding).where(eq(userOnboarding.userId, userId)).limit(1);
  const [patient, item, plan, push, welcomeOffer] = await Promise.all([
    exists(db.select({ n: sql<number>`count(*)::int` }).from(patients)
      .where(and(eq(patients.organizationId, orgId), isNull(patients.archivedAt)))),
    exists(db.select({ n: sql<number>`count(*)::int` }).from(items)
      .where(and(eq(items.organizationId, orgId), isNull(items.archivedAt)))),
    exists(db.select({ n: sql<number>`count(*)::int` }).from(carePlans)
      .where(and(eq(carePlans.organizationId, orgId), eq(carePlans.active, true)))),
    // Notificações ativas: Web Push no navegador ou aparelho nativo.
    Promise.all([
      exists(db.select({ n: sql<number>`count(*)::int` }).from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId))),
      exists(db.select({ n: sql<number>`count(*)::int` }).from(pushDevices).where(eq(pushDevices.userId, userId))),
    ]).then(([web, native]) => web || native),
    welcomeOfferFor(db, userId, orgId, !!row?.welcomeOfferSeenAt),
  ]);
  return {
    showWelcome: !row?.welcomeSeenAt,
    welcomeOffer,
    checklist: { show: !row?.checklistDoneAt, steps: { patient, item, plan, push } },
  };
}

/** Registra que o usuário concluiu (ou pulou) as boas-vindas. O primeiro registro vale; repetir não altera. */
export async function markWelcomeSeen(db: Db, userId: string): Promise<void> {
  await db.insert(userOnboarding).values({ userId, welcomeSeenAt: new Date() })
    .onConflictDoUpdate({
      target: userOnboarding.userId,
      set: { welcomeSeenAt: sql`coalesce(${userOnboarding.welcomeSeenAt}, now())` },
    });
}

/** Registra que o usuário concluiu ou dispensou o checklist de primeiros passos. */
export async function dismissChecklist(db: Db, userId: string): Promise<void> {
  await db.insert(userOnboarding).values({ userId, checklistDoneAt: new Date() })
    .onConflictDoUpdate({
      target: userOnboarding.userId,
      set: { checklistDoneAt: sql`coalesce(${userOnboarding.checklistDoneAt}, now())` },
    });
}

/** Registra que a oferta de boas-vindas foi exibida (a "única vez"). O primeiro registro vale; repetir não altera. */
export async function markWelcomeOfferSeen(db: Db, userId: string): Promise<void> {
  await db.insert(userOnboarding).values({ userId, welcomeOfferSeenAt: new Date() })
    .onConflictDoUpdate({
      target: userOnboarding.userId,
      set: { welcomeOfferSeenAt: sql`coalesce(${userOnboarding.welcomeOfferSeenAt}, now())` },
    });
}
