import { and, eq, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { carePlans, cats, items, type PushSubscriptionRow } from "@/lib/db/schema";
import { listSubscriptionsForOrg, removeSubscription } from "@/lib/services/push";

export type PushPayload = { title: string; body: string; tag: string; url: string };
export type PushSender = (
  sub: PushSubscriptionRow, payload: PushPayload,
) => Promise<{ ok: true } | { ok: false; gone: boolean }>;

const dueCondition = (now: Date) => and(
  eq(carePlans.active, true),
  lte(carePlans.nextDueAt, now),
  or(isNull(carePlans.endAt), lte(carePlans.nextDueAt, carePlans.endAt)),
  or(isNull(carePlans.notifiedForDueAt), ne(carePlans.notifiedForDueAt, carePlans.nextDueAt)),
);

/** Notifica os horários vencidos uma única vez cada. Seguro para execuções concorrentes. */
export async function dispatchDue(
  db: Db, now: Date, send: PushSender,
): Promise<{ plans: number; sent: number; removed: number }> {
  const eligible = await db
    .select({ plan: carePlans, catName: cats.name, itemName: items.name })
    .from(carePlans)
    .innerJoin(cats, and(eq(cats.id, carePlans.catId), isNull(cats.archivedAt)))
    .innerJoin(items, and(eq(items.id, carePlans.itemId), isNull(items.archivedAt)))
    .where(dueCondition(now));
  if (eligible.length === 0) return { plans: 0, sent: 0, removed: 0 };

  // Reivindica antes de enviar: quem não conseguir atualizar a linha não envia.
  const claimed = await db.update(carePlans)
    .set({ notifiedForDueAt: sql`${carePlans.nextDueAt}` })
    .where(and(inArray(carePlans.id, eligible.map((e) => e.plan.id)), dueCondition(now)))
    .returning({ id: carePlans.id });
  const claimedIds = new Set(claimed.map((c) => c.id));
  const mine = eligible.filter((e) => claimedIds.has(e.plan.id));

  const subsByOrg = new Map<string, PushSubscriptionRow[]>();
  let sent = 0;
  let removed = 0;
  for (const { plan, catName, itemName } of mine) {
    if (!subsByOrg.has(plan.organizationId)) {
      subsByOrg.set(plan.organizationId, await listSubscriptionsForOrg(db, plan.organizationId));
    }
    const payload: PushPayload = {
      title: "Hora do cuidado",
      body: `${catName} — ${itemName}${plan.dose ? ` (${plan.dose})` : ""}`,
      tag: `${plan.id}-${plan.nextDueAt.getTime()}`,
      url: "/",
    };
    for (const sub of subsByOrg.get(plan.organizationId)!) {
      try {
        const res = await send(sub, payload);
        if (res.ok) sent++;
        else if (res.gone) {
          await removeSubscription(db, sub.endpoint);
          removed++;
        }
      } catch (err) {
        console.error("push send failed", sub.endpoint, err);
      }
    }
  }
  return { plans: mine.length, sent, removed };
}
