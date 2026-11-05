import { and, eq, gt, isNull, lt, lte, or } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { carePlans, careSlots, cats, items } from "@/lib/db/schema";
import { NotFound } from "@/lib/errors";
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

/** Um cuidado só pode ser resolvido até 15 min antes do horário (não há registro adiantado). */
export const EARLY_WINDOW_MS = 15 * 60_000;

export class TooEarly extends Error {
  constructor() {
    super("Este cuidado ainda não está na hora");
  }
}

export class InvalidAppliedAt extends Error {
  constructor() {
    super("Hora da aplicação inválida");
  }
}

export type ResolveInput = {
  planId: string; scheduledFor: Date; outcome: "done" | "skipped";
  value?: string; note?: string; now?: Date;
  /** Hora real da aplicação. Só vale em "done" de rotina que reprograma; desloca os próximos horários. */
  appliedAt?: Date;
};

/**
 * Resolve (feito/pulado) o cuidado de um horário. Só atualiza o slot; a rotina muda apenas quando ela
 * reprograma e o horário resolvido é o último vencido: aí a hora real vira a nova âncora.
 * Idempotente: o primeiro registro vence, os demais devolvem recorded:false.
 */
export async function resolveSlot(
  db: Db, orgId: string, userId: string, input: ResolveInput,
): Promise<{ recorded: boolean }> {
  const now = input.now ?? new Date();
  if (input.scheduledFor.getTime() > now.getTime() + EARLY_WINDOW_MS) throw new TooEarly();
  await ensureSlots(db, now, orgId);
  const [row] = await db.select({ id: careSlots.id, plan: carePlans }).from(careSlots)
    .innerJoin(carePlans, eq(carePlans.id, careSlots.carePlanId))
    .where(and(
      eq(careSlots.organizationId, orgId), eq(careSlots.carePlanId, input.planId),
      eq(careSlots.scheduledFor, input.scheduledFor),
    )).limit(1);
  if (!row) throw new NotFound("Cuidado");
  const { plan } = row;

  const appliedAt = plan.reschedule && input.outcome === "done" ? input.appliedAt : undefined;
  const slotAt = input.scheduledFor.getTime();
  if (appliedAt && (
    appliedAt.getTime() > now.getTime() || appliedAt.getTime() < slotAt - (plan.intervalMinutes * 60_000) / 2
  )) throw new InvalidAppliedAt();

  return db.transaction(async (tx) => {
    const updated = await tx.update(careSlots).set({
      outcome: input.outcome, resolvedByUserId: userId, resolvedAt: appliedAt ?? now,
      value: input.value?.trim() || null, note: input.note?.trim() || null,
    }).where(and(eq(careSlots.id, row.id), isNull(careSlots.outcome))).returning({ id: careSlots.id });
    if (updated.length === 0) return { recorded: false };
    if (!appliedAt) return { recorded: true };

    // Só desloca a grade se este for o último horário vencido; resolver um antigo não reescreve o futuro.
    const [later] = await tx.select({ id: careSlots.id }).from(careSlots).where(and(
      eq(careSlots.carePlanId, plan.id), gt(careSlots.scheduledFor, input.scheduledFor),
      lte(careSlots.scheduledFor, new Date(now.getTime() + EARLY_WINDOW_MS)),
    )).limit(1);
    if (later) return { recorded: true };

    const cutoff = new Date(Math.max(slotAt, appliedAt.getTime()));
    await tx.delete(careSlots).where(and(
      eq(careSlots.carePlanId, plan.id), isNull(careSlots.outcome), gt(careSlots.scheduledFor, cutoff),
    ));
    const next = new Date(appliedAt.getTime() + plan.intervalMinutes * 60_000);
    await tx.update(carePlans).set({ anchorAt: appliedAt, nextDueAt: next, startsAt: next, slotsThrough: null })
      .where(eq(carePlans.id, plan.id));
    return { recorded: true };
  });
}
