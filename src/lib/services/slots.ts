import { and, eq, isNull, lt, or } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { carePlans, careSlots, cats, items } from "@/lib/db/schema";
import { slotsBetween } from "@/lib/schedule";
import { dayBounds, dayKey } from "@/lib/time";

/**
 * Materializa os horários esperados de cada rotina ativa até o fim do dia de `now` (Brasília).
 * Idempotente e seguro sob concorrência (unique em rotina+horário). Devolve quantos slots criou.
 */
export async function ensureSlots(db: Db, now: Date, orgId?: string): Promise<number> {
  const endOfToday = dayBounds(dayKey(now)).end;
  const rows = await db
    .select({ plan: carePlans })
    .from(carePlans)
    .innerJoin(cats, and(eq(cats.id, carePlans.catId), isNull(cats.archivedAt)))
    .innerJoin(items, and(eq(items.id, carePlans.itemId), isNull(items.archivedAt)))
    .where(and(eq(carePlans.active, true), orgId ? eq(carePlans.organizationId, orgId) : undefined));

  let inserted = 0;
  for (const { plan } of rows) {
    const after = plan.slotsThrough ? new Date(plan.slotsThrough.getTime() + 1) : plan.startsAt;
    const from = after.getTime() > plan.startsAt.getTime() ? after : plan.startsAt;
    const to = plan.endAt && plan.endAt.getTime() < endOfToday.getTime() ? plan.endAt : endOfToday;
    const due = slotsBetween(plan.anchorAt, plan.intervalMinutes, from, to);
    if (due.length === 0) continue;

    const created = await db
      .insert(careSlots)
      .values(due.map((scheduledFor) => ({ organizationId: plan.organizationId, carePlanId: plan.id, scheduledFor })))
      .onConflictDoNothing()
      .returning({ id: careSlots.id });
    inserted += created.length;

    const last = due[due.length - 1];
    await db.update(carePlans).set({ slotsThrough: last })
      .where(and(eq(carePlans.id, plan.id), or(isNull(carePlans.slotsThrough), lt(carePlans.slotsThrough, last))));
  }
  return inserted;
}
