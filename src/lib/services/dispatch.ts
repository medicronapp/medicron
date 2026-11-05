import { and, eq, inArray, isNull, lt, lte, or } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { carePlans, careSlots, cats, items, type PushSubscriptionRow } from "@/lib/db/schema";
import { ensureSlots } from "@/lib/services/slots";
import { listSubscriptionsForOrg, removeSubscription } from "@/lib/services/push";

export type PushPayload = { title: string; body: string; tag: string; url: string };
export type PushSender = (
  sub: PushSubscriptionRow, payload: PushPayload,
) => Promise<{ ok: true } | { ok: false; gone: boolean }>;

/**
 * Notifica os cuidados vencidos e ainda não resolvidos, uma vez por horário. Por rotina avisa só o
 * horário mais recente (os mais antigos pendentes são marcados como avisados sem enviar). Seguro para
 * execuções concorrentes: o slot é reivindicado por compare-and-set em notified_at antes do envio.
 */
export async function dispatchDue(
  db: Db, now: Date, send: PushSender,
): Promise<{ plans: number; sent: number; removed: number }> {
  await ensureSlots(db, now);

  const candidates = await db
    .select({ slot: careSlots, plan: carePlans, catName: cats.name, itemName: items.name })
    .from(careSlots)
    .innerJoin(carePlans, eq(carePlans.id, careSlots.carePlanId))
    .innerJoin(cats, and(eq(cats.id, carePlans.catId), isNull(cats.archivedAt)))
    .innerJoin(items, and(eq(items.id, carePlans.itemId), isNull(items.archivedAt)))
    .where(and(
      eq(carePlans.active, true),
      isNull(careSlots.outcome), isNull(careSlots.notifiedAt), lte(careSlots.scheduledFor, now),
      // Horários que a versão anterior já avisou (notified_for_due_at) não são reenviados.
      or(isNull(carePlans.notifiedForDueAt), lt(carePlans.notifiedForDueAt, careSlots.scheduledFor)),
    ))
    .orderBy(careSlots.scheduledFor);

  const byPlan = new Map<string, typeof candidates>();
  for (const c of candidates) byPlan.set(c.plan.id, [...(byPlan.get(c.plan.id) ?? []), c]);

  const subsByOrg = new Map<string, PushSubscriptionRow[]>();
  let plans = 0;
  let sent = 0;
  let removed = 0;

  for (const group of byPlan.values()) {
    const latest = group[group.length - 1];
    const claimed = await db.update(careSlots)
      .set({ notifiedAt: now })
      .where(and(inArray(careSlots.id, group.map((g) => g.slot.id)), isNull(careSlots.notifiedAt), isNull(careSlots.outcome)))
      .returning({ id: careSlots.id });
    if (!claimed.some((c) => c.id === latest.slot.id)) continue; // outra execução já reivindicou
    plans++;

    const { plan, catName, itemName, slot } = latest;
    if (!subsByOrg.has(plan.organizationId)) {
      subsByOrg.set(plan.organizationId, await listSubscriptionsForOrg(db, plan.organizationId));
    }
    const subs = subsByOrg.get(plan.organizationId)!;
    const payload: PushPayload = {
      title: "Hora do cuidado",
      body: `${catName} — ${itemName}${plan.dose ? ` (${plan.dose})` : ""}`,
      tag: `${plan.id}-${slot.scheduledFor.getTime()}`,
      url: "/",
    };
    const results = await Promise.allSettled(subs.map((sub) => send(sub, payload)));
    let okCount = 0;
    let failed = 0;
    for (const [i, r] of results.entries()) {
      const sub = subs[i];
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
    // Nenhum envio chegou por falha transitória: devolve o horário para nova tentativa.
    if (okCount === 0 && failed > 0) {
      await db.update(careSlots).set({ notifiedAt: null })
        .where(and(eq(careSlots.id, slot.id), eq(careSlots.notifiedAt, now)));
    }
  }
  return { plans, sent, removed };
}
