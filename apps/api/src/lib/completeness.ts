import { addDays, dayKey, windowEnd } from "@/lib/time";

export type SlotFacts = { scheduledFor: Date; outcome: "done" | "skipped" | null; resolvedAt: Date | null };
export type DayStatus = "empty" | "ok" | "open" | "pending" | "lost";
export type Streak = { days: number; atRisk: boolean; pendingKeys: string[] };

/**
 * Estado de um dia a partir dos cuidados esperados nele. Pulado conta como resolvido;
 * o que fica sem registro além da janela de solução (fim do dia seguinte) perde o dia.
 */
export function dayStatus(slots: SlotFacts[], key: string, now: Date): DayStatus {
  if (slots.length === 0) return "empty";
  const limit = windowEnd(key).getTime();
  const lost = slots.some((s) =>
    s.outcome === null ? now.getTime() > limit : s.resolvedAt !== null && s.resolvedAt.getTime() > limit,
  );
  if (lost) return "lost";
  if (slots.every((s) => s.outcome !== null)) return "ok";
  return key === dayKey(now) ? "open" : "pending";
}

/** Dias seguidos em dia, de hoje para trás até `earliestKey`. Dias vazios são transparentes. */
export function computeStreak(statuses: Map<string, DayStatus>, todayKey: string, earliestKey: string): Streak {
  let days = 0;
  const pendingKeys: string[] = [];
  for (let key = todayKey; key >= earliestKey; key = addDays(key, -1)) {
    const status = statuses.get(key) ?? "empty";
    if (status === "lost") break;
    if (status === "ok") days += 1;
    else if (status === "pending") pendingKeys.push(key);
  }
  return { days, atRisk: pendingKeys.length > 0, pendingKeys };
}
