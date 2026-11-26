import { addDays, dayKey, intervalLabel, toLocalInput } from "./time";
import { slotsBetween } from "./schedule";

/** Atalhos de frequência da tela de rotina. Cada um tem minutos próprios: dois botões nunca ficam marcados juntos. */
export const FREQUENCY_CHIPS: { id: string; label: string; minutes: number }[] = [
  { id: "1x", label: "1x ao dia", minutes: 1440 },
  { id: "2x", label: "2x ao dia", minutes: 720 },
  { id: "3x", label: "3x ao dia", minutes: 480 },
  { id: "4h", label: "A cada 4 h", minutes: 240 },
  { id: "6h", label: "A cada 6 h", minutes: 360 },
  { id: "alt", label: "Dia sim, dia não", minutes: 2880 },
  { id: "sem", label: "Toda semana", minutes: 10080 },
];

export function frequencyChipFor(minutes: number) {
  return FREQUENCY_CHIPS.find((c) => c.minutes === minutes) ?? null;
}

/** "6 doses por dia"; só quando o intervalo divide o dia em partes iguais. */
export function dosesPerDayLabel(minutes: number): string | null {
  if (minutes > 1440 || 1440 % minutes !== 0) return null;
  const n = 1440 / minutes;
  return `${n} ${n === 1 ? "dose" : "doses"} por dia`;
}

/** Primeira dose pelos atalhos: "agora" (próximo minuto cheio, para nunca cair no passado) ou a próxima hora cheia. */
export function firstDoseAt(kind: "now" | "nextHour", now: Date): string {
  const step = kind === "now" ? 60_000 : 3_600_000;
  return toLocalInput(new Date(Math.ceil(now.getTime() / step) * step));
}

export const TIME_SHORTCUTS: { label: string; time: string }[] = [
  { label: "Manhã 08:00", time: "08:00" },
  { label: "Almoço 12:00", time: "12:00" },
  { label: "Noite 20:00", time: "20:00" },
];

export const DURATION_DAYS = [3, 5, 7, 10, 14, 30];

/** Fim de um tratamento de N dias: 23:59 do N-ésimo dia (o dia de início conta como o 1º). */
export function endOfDurationLocal(startLocal: string, days: number): string {
  return `${addDays(startLocal.slice(0, 10), days - 1)}T23:59`;
}

/** Quantos dias de atalho essa data final representa; null se for outra data. */
export function durationDaysFor(startLocal: string, endLocal: string): number | null {
  return DURATION_DAYS.find((n) => endOfDurationLocal(startLocal, n) === endLocal) ?? null;
}

/** Próximos horários da rotina (grade anchor + k*intervalo), a partir de `from` e até a data final. */
export function upcomingDoses(p: { anchor: Date; intervalMinutes: number; endAt: Date | null; from: Date; limit: number }): Date[] {
  const step = p.intervalMinutes * 60_000;
  const to = p.endAt ?? new Date(Math.max(p.from.getTime(), p.anchor.getTime()) + (p.limit + 1) * step);
  return slotsBetween(p.anchor, p.intervalMinutes, p.from, to, p.limit);
}

/** "hoje", "amanhã" ou "dd/mm", pelo dia em Brasília. */
export function dayLabel(date: Date, now: Date): string {
  const key = dayKey(date);
  const today = dayKey(now);
  if (key === today) return "hoje";
  if (key === addDays(today, 1)) return "amanhã";
  const [, m, d] = key.split("-");
  return `${d}/${m}`;
}

type Duration = { days: number } | { until: string } | null;

/** Frase única da rotina: "Limpeza do ferimento, a cada 4 horas, por 7 dias". */
export function routineSummary(p: { name: string; intervalMinutes: number; duration: Duration }): string {
  const label = intervalLabel(p.intervalMinutes);
  const every = p.name ? label.charAt(0).toLowerCase() + label.slice(1) : label;
  const end = p.duration === null ? "uso contínuo" : "days" in p.duration ? `por ${p.duration.days} ${p.duration.days === 1 ? "dia" : "dias"}` : `até ${p.duration.until}`;
  return [p.name, every, end].filter(Boolean).join(", ");
}
