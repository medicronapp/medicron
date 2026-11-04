import { and, eq, isNull, lte } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { carePlans, cats, items, type PushSubscriptionRow } from "@/lib/db/schema";
import { latestSlotAtOrBefore } from "@/lib/schedule";
import { listSubscriptionsForOrg, removeSubscription } from "@/lib/services/push";

export type PushPayload = { title: string; body: string; tag: string; url: string };
export type PushSender = (
  sub: PushSubscriptionRow, payload: PushPayload,
) => Promise<{ ok: true } | { ok: false; gone: boolean }>;

/**
 * Notifica cada horário vencido uma única vez. Dose não registrada é lembrada de novo
 * a cada intervalo (um aviso por slot). Seguro para execuções concorrentes: o slot é
 * reivindicado por compare-and-set em notified_for_due_at antes do envio.
 */
export async function dispatchDue(
  db: Db, now: Date, send: PushSender,
): Promise<{ plans: number; sent: number; removed: number }> {
  const candidates = await db
    .select({ plan: carePlans, catName: cats.name, itemName: items.name })
    .from(carePlans)
    .innerJoin(cats, and(eq(cats.id, carePlans.catId), isNull(cats.archivedAt)))
    .innerJoin(items, and(eq(items.id, carePlans.itemId), isNull(items.archivedAt)))
    .where(and(eq(carePlans.active, true), lte(carePlans.nextDueAt, now)));

  const subsByOrg = new Map<string, PushSubscriptionRow[]>();
  let plans = 0;
  let sent = 0;
  let removed = 0;

  for (const { plan, catName, itemName } of candidates) {
    const slot = latestSlotAtOrBefore(plan.anchorAt, plan.intervalMinutes, now);
    if (!slot || (plan.endAt && slot.getTime() > plan.endAt.getTime())) continue;
    if (plan.notifiedForDueAt?.getTime() === slot.getTime()) continue;

    const claimed = await db.update(carePlans)
      .set({ notifiedForDueAt: slot })
      .where(and(
        eq(carePlans.id, plan.id), eq(carePlans.active, true),
        plan.notifiedForDueAt ? eq(carePlans.notifiedForDueAt, plan.notifiedForDueAt) : isNull(carePlans.notifiedForDueAt),
      ))
      .returning({ id: carePlans.id });
    if (claimed.length === 0) continue; // outra execução já reivindicou
    plans++;

    if (!subsByOrg.has(plan.organizationId)) {
      subsByOrg.set(plan.organizationId, await listSubscriptionsForOrg(db, plan.organizationId));
    }
    const payload: PushPayload = {
      title: "Hora do cuidado",
      body: `${catName} — ${itemName}${plan.dose ? ` (${plan.dose})` : ""}`,
      tag: `${plan.id}-${slot.getTime()}`,
      url: "/",
    };
    const results = await Promise.allSettled(subsByOrg.get(plan.organizationId)!.map((sub) => send(sub, payload)));
    let okCount = 0;
    let failed = 0;
    for (const [i, r] of results.entries()) {
      const sub = subsByOrg.get(plan.organizationId)![i];
      if (r.status === "rejected") {
        failed++;
        console.error("push send failed", sub.endpoint, r.reason);
      } else if (r.value.ok) okCount++;
      else if (r.value.gone) {
        await removeSubscription(db, sub.endpoint);
        removed++;
      }
    }
    sent += okCount;
    // Nenhum envio chegou por falha transitória: devolve o slot para nova tentativa.
    if (okCount === 0 && failed > 0) {
      await db.update(carePlans)
        .set({ notifiedForDueAt: plan.notifiedForDueAt })
        .where(and(eq(carePlans.id, plan.id), eq(carePlans.notifiedForDueAt, slot)));
    }
  }
  return { plans, sent, removed };
}
