import { and, asc, desc, eq, isNull, lte, or } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { carePlans, cats, items, doseLogs, user, type CarePlan, type Cat, type Item } from "@/lib/db/schema";
import { NotFound } from "@/lib/errors";
import { nextSlotAfter, isPlanLive } from "@/lib/schedule";

const WINDOW_MS = 15 * 60_000;

export type AgendaEntry = { plan: CarePlan; cat: Cat; item: Item; dueAt: Date };
export type Agenda = { overdue: AgendaEntry[]; dueNow: AgendaEntry[]; upcoming: AgendaEntry[] };

export async function listAgenda(db: Db, orgId: string, now: Date, horizonHours = 24): Promise<Agenda> {
  const horizon = new Date(now.getTime() + horizonHours * 3600_000);
  const rows = await db
    .select({ plan: carePlans, cat: cats, item: items })
    .from(carePlans)
    .innerJoin(cats, eq(cats.id, carePlans.catId))
    .innerJoin(items, eq(items.id, carePlans.itemId))
    .where(and(
      eq(carePlans.organizationId, orgId), eq(carePlans.active, true),
      isNull(cats.archivedAt), isNull(items.archivedAt),
      lte(carePlans.nextDueAt, horizon),
      or(isNull(carePlans.endAt), lte(carePlans.nextDueAt, carePlans.endAt)),
    ))
    .orderBy(asc(carePlans.nextDueAt));

  const agenda: Agenda = { overdue: [], dueNow: [], upcoming: [] };
  for (const r of rows) {
    const entry = { ...r, dueAt: r.plan.nextDueAt };
    const diff = entry.dueAt.getTime() - now.getTime();
    if (diff < -WINDOW_MS) agenda.overdue.push(entry);
    else if (diff <= WINDOW_MS) agenda.dueNow.push(entry);
    else agenda.upcoming.push(entry);
  }
  return agenda;
}

export type RecordDoseInput = {
  planId: string; scheduledFor: Date; outcome: "done" | "skipped";
  value?: string; note?: string; now?: Date;
};

/**
 * Registra a dose do slot `scheduledFor` e avança o plano. Idempotente: só o primeiro
 * registro de um slot vence (update condicional em next_due_at); os demais devolvem recorded:false.
 */
export async function recordDose(
  db: Db, orgId: string, userId: string, input: RecordDoseInput,
): Promise<{ recorded: boolean; nextDueAt: Date | null }> {
  const now = input.now ?? new Date();
  return db.transaction(async (tx) => {
    const [plan] = await tx.select().from(carePlans)
      .where(and(eq(carePlans.id, input.planId), eq(carePlans.organizationId, orgId))).limit(1);
    if (!plan) throw new NotFound("Plano");

    const after = new Date(Math.max(now.getTime(), input.scheduledFor.getTime()));
    const next = nextSlotAfter(plan.anchorAt, plan.intervalMinutes, after);
    const live = isPlanLive({ active: true, endAt: plan.endAt }, next);

    const claimed = await tx.update(carePlans)
      .set({ nextDueAt: next, active: live })
      .where(and(
        eq(carePlans.id, plan.id), eq(carePlans.organizationId, orgId),
        eq(carePlans.active, true), eq(carePlans.nextDueAt, input.scheduledFor),
      ))
      .returning({ id: carePlans.id });
    if (claimed.length === 0) return { recorded: false, nextDueAt: plan.active ? plan.nextDueAt : null };

    await tx.insert(doseLogs).values({
      organizationId: orgId, carePlanId: plan.id, scheduledFor: input.scheduledFor,
      outcome: input.outcome, doneByUserId: userId, doneAt: now,
      value: input.value?.trim() || null, note: input.note?.trim() || null,
    });
    return { recorded: true, nextDueAt: live ? next : null };
  });
}

export type RecentLog = {
  id: string; outcome: "done" | "skipped"; scheduledFor: Date; doneAt: Date;
  value: string | null; note: string | null; catName: string; itemName: string; userName: string;
};

export async function listRecentLogs(db: Db, orgId: string, limit = 20): Promise<RecentLog[]> {
  const rows = await db
    .select({
      id: doseLogs.id, outcome: doseLogs.outcome, scheduledFor: doseLogs.scheduledFor, doneAt: doseLogs.doneAt,
      value: doseLogs.value, note: doseLogs.note,
      catName: cats.name, itemName: items.name, userName: user.name,
    })
    .from(doseLogs)
    .innerJoin(carePlans, eq(carePlans.id, doseLogs.carePlanId))
    .innerJoin(cats, eq(cats.id, carePlans.catId))
    .innerJoin(items, eq(items.id, carePlans.itemId))
    .innerJoin(user, eq(user.id, doseLogs.doneByUserId))
    .where(eq(doseLogs.organizationId, orgId))
    .orderBy(desc(doseLogs.doneAt))
    .limit(limit);
  return rows;
}
