import { and, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { carePlans, items, patients, pushSubscriptions, userOnboarding } from "@/lib/db/schema";

export type ChecklistSteps = { patient: boolean; item: boolean; plan: boolean; push: boolean };
export type Onboarding = { showWelcome: boolean; checklist: { show: boolean; steps: ChecklistSteps } };

const exists = async (q: Promise<{ n: number }[]>) => (await q)[0].n > 0;

/** O que mostrar de onboarding para o usuário nesta conta. Os passos vêm do uso real, não de marcações. */
export async function getOnboarding(db: Db, userId: string, orgId: string): Promise<Onboarding> {
  const [row] = await db.select().from(userOnboarding).where(eq(userOnboarding.userId, userId)).limit(1);
  const [patient, item, plan, push] = await Promise.all([
    exists(db.select({ n: sql<number>`count(*)::int` }).from(patients)
      .where(and(eq(patients.organizationId, orgId), isNull(patients.archivedAt)))),
    exists(db.select({ n: sql<number>`count(*)::int` }).from(items)
      .where(and(eq(items.organizationId, orgId), isNull(items.archivedAt)))),
    exists(db.select({ n: sql<number>`count(*)::int` }).from(carePlans)
      .where(and(eq(carePlans.organizationId, orgId), eq(carePlans.active, true)))),
    exists(db.select({ n: sql<number>`count(*)::int` }).from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId))),
  ]);
  return {
    showWelcome: !row?.welcomeSeenAt,
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
