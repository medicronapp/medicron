import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { carePlans, patients, items } from "@/lib/db/schema";
import { nextSlotAfter } from "@/lib/schedule";
import { dispatchDue, hasPendingNotifications, type DeviceSender, type PushSender } from "@/lib/services/dispatch";
import { SAFETY_MS, getHintStore, type HintStore } from "@/lib/wake-store";

export { SAFETY_MS, invalidateWakeHint, memoryHintStore, setHintStore, upstashHintStore, type HintStore } from "@/lib/wake-store";

/** A próxima dose de qualquer rotina ativa, estritamente depois de `now`; null se nenhuma rotina ativa tem dose futura. */
export async function nextWakeAt(db: Db, now: Date): Promise<Date | null> {
  const rows = await db
    .select({ plan: carePlans })
    .from(carePlans)
    .innerJoin(patients, and(eq(patients.id, carePlans.patientId), isNull(patients.archivedAt)))
    .innerJoin(items, and(eq(items.id, carePlans.itemId), isNull(items.archivedAt)))
    .where(eq(carePlans.active, true));
  let best: Date | null = null;
  for (const { plan } of rows) {
    // A grade só vale a partir de `startsAt`: antes disso a primeira dose é o primeiro horário da grade a partir dele.
    const after = new Date(Math.max(now.getTime(), plan.startsAt.getTime() - 1));
    const next = nextSlotAfter(plan.anchorAt, plan.intervalMinutes, after);
    if (plan.endAt && next.getTime() > plan.endAt.getTime()) continue;
    if (!best || next.getTime() < best.getTime()) best = next;
  }
  return best;
}

export type TickResult = { skipped: boolean; plans: number; sent: number; removed: number };

/**
 * O toque de minuto em minuto do agendador. Com uma dica válida e antes da próxima dose, responde sem abrir o banco (o banco
 * gratuito cobra por tempo ligado). Caso contrário dispara de verdade e grava a próxima dose. A versão da dica impede que uma
 * dica calculada antes de uma mudança de rotina seja tomada como boa.
 */
export async function dispatchIfDue(
  db: Db, now: Date, send: PushSender, sendDevices?: DeviceSender, store: HintStore | null = getHintStore(),
): Promise<TickResult> {
  let state: Awaited<ReturnType<HintStore["read"]>> | null = null;
  try {
    state = store ? await store.read() : null;
  } catch (err) {
    console.error("cache de próxima dose: falha ao ler (segue pelo banco)", err instanceof Error ? err.message : err);
  }
  const t = now.getTime();
  const h = state?.hint;
  if (state && h && h.version === state.version && t >= h.checkedAt && t < h.nextWake && t - h.checkedAt < SAFETY_MS) {
    return { skipped: true, plans: 0, sent: 0, removed: 0 };
  }

  const result = await dispatchDue(db, now, send, sendDevices);

  // Só grava a dica se conhece a versão (leitura deu certo) e nada ficou para ser refeito (envio que falhou).
  if (store && state && !(await hasPendingNotifications(db, now))) {
    try {
      const next = await nextWakeAt(db, now);
      await store.set({ nextWake: next?.getTime() ?? Number.MAX_SAFE_INTEGER, checkedAt: t, version: state.version }, Math.ceil(SAFETY_MS / 1000));
    } catch (err) {
      console.error("cache de próxima dose: falha ao gravar", err instanceof Error ? err.message : err);
    }
  }
  return { skipped: false, ...result };
}
