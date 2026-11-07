const MS_PER_MIN = 60_000;

export const INTERVAL_PRESETS: { label: string; minutes: number }[] = [
  { label: "A cada 4 horas", minutes: 240 },
  { label: "A cada 6 horas", minutes: 360 },
  { label: "A cada 8 horas", minutes: 480 },
  { label: "A cada 12 horas", minutes: 720 },
  { label: "1 vez ao dia", minutes: 1440 },
  { label: "A cada 2 dias", minutes: 2880 },
  { label: "A cada 3 dias", minutes: 4320 },
  { label: "1 vez por semana", minutes: 10080 },
];

/** Primeiro instante anchor + k*interval (k >= 0) estritamente maior que `after`. */
export function nextSlotAfter(anchor: Date, intervalMinutes: number, after: Date): Date {
  if (!(intervalMinutes > 0)) throw new RangeError("intervalMinutes deve ser > 0");
  const step = intervalMinutes * MS_PER_MIN;
  if (after.getTime() < anchor.getTime()) return new Date(anchor.getTime());
  const k = Math.floor((after.getTime() - anchor.getTime()) / step) + 1;
  return new Date(anchor.getTime() + k * step);
}

/** Âncora se ainda não passou (ou é agora); senão o próximo slot futuro. */
export function firstDueAt(anchor: Date, intervalMinutes: number, now: Date): Date {
  if (anchor.getTime() >= now.getTime()) return new Date(anchor.getTime());
  return nextSlotAfter(anchor, intervalMinutes, now);
}

export function isPlanLive(p: { active: boolean; endAt: Date | null }, slot: Date): boolean {
  return p.active && (p.endAt === null || slot.getTime() <= p.endAt.getTime());
}

/** Último slot anchor + k*interval <= `at`; null se `at` é anterior à âncora. */
export function latestSlotAtOrBefore(anchor: Date, intervalMinutes: number, at: Date): Date | null {
  if (!(intervalMinutes > 0)) throw new RangeError("intervalMinutes deve ser > 0");
  if (at.getTime() < anchor.getTime()) return null;
  const step = intervalMinutes * MS_PER_MIN;
  const k = Math.floor((at.getTime() - anchor.getTime()) / step);
  return new Date(anchor.getTime() + k * step);
}

/** Horários anchor + k*intervalo (k >= 0) com from <= t <= to, crescentes, no máximo `limit`. */
export function slotsBetween(anchor: Date, intervalMinutes: number, from: Date, to: Date, limit = 1000): Date[] {
  if (!(intervalMinutes > 0)) throw new RangeError("intervalMinutes deve ser > 0");
  if (from.getTime() > to.getTime()) return [];
  const step = intervalMinutes * MS_PER_MIN;
  const k0 = Math.max(0, Math.ceil((from.getTime() - anchor.getTime()) / step));
  const out: Date[] = [];
  for (let k = k0; out.length < limit; k++) {
    const t = anchor.getTime() + k * step;
    if (t > to.getTime()) break;
    out.push(new Date(t));
  }
  return out;
}
