import { addDays, dayKey, dayLabel, endOfDurationLocal, firstDoseAt, parseLocalInput, toLocalInput } from "@medicron/shared";

export type FirstDose =
  | { kind: "now" }
  | { kind: "nextHour" }
  | { kind: "custom"; day: "today" | "tomorrow" | "other"; otherDate: string; time: string };

export type Duration = { kind: "none" } | { kind: "days"; days: number } | { kind: "until"; date: string };

/** Primeira dose como "YYYY-MM-DDTHH:mm" (Brasília). "Agora" é recalculado a cada chamada. */
export function resolveFirstDose(fd: FirstDose, now: Date): string {
  if (fd.kind === "now" || fd.kind === "nextHour") return firstDoseAt(fd.kind, now);
  const today = dayKey(now);
  const date = fd.day === "today" ? today : fd.day === "tomorrow" ? addDays(today, 1) : fd.otherDate;
  return `${date}T${fd.time}`;
}

/** Ao abrir "Escolher o horário": hoje, na próxima hora cheia, com "outro dia" já no dia seguinte ao de amanhã. */
export function initialCustom(now: Date): Extract<FirstDose, { kind: "custom" }> {
  return { kind: "custom", day: "today", otherDate: addDays(dayKey(now), 2), time: firstDoseAt("nextHour", now).slice(11) };
}

/** Troca a hora; se hoje essa hora já passou, a dose vai para amanhã (nunca uma primeira dose no passado sem querer). */
export function withTime(fd: Extract<FirstDose, { kind: "custom" }>, time: string, now: Date): Extract<FirstDose, { kind: "custom" }> {
  const passed = fd.day === "today" && `${dayKey(now)}T${time}` <= toLocalInput(now);
  return { ...fd, time, day: passed ? "tomorrow" : fd.day };
}

/** Fim do tratamento como "YYYY-MM-DDTHH:mm" (Brasília), ou null se for contínuo. */
export function resolveEnd(d: Duration, startLocal: string): string | null {
  if (d.kind === "none") return null;
  return d.kind === "days" ? endOfDurationLocal(startLocal, d.days) : `${d.date}T23:59`;
}

/** "dd/mm" de uma data "YYYY-MM-DD…". */
export const shortDate = (local: string) => `${local.slice(8, 10)}/${local.slice(5, 7)}`;

/** "Hoje às 14:30", "Amanhã às 08:00" ou "01/12 às 20:00". */
export function whenLabel(local: string, now: Date): string {
  const day = dayLabel(parseLocalInput(local), now);
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} às ${local.slice(11)}`;
}

/** Valor do campo "Quantidade" a partir dos minutos, na maior unidade que divide certinho. */
export type Unit = "minutes" | "hours" | "days";
export const UNIT_MINUTES: Record<Unit, number> = { minutes: 1, hours: 60, days: 1440 };
export function splitInterval(minutes: number): { amount: number; unit: Unit } {
  if (minutes % 1440 === 0) return { amount: minutes / 1440, unit: "days" };
  if (minutes % 60 === 0) return { amount: minutes / 60, unit: "hours" };
  return { amount: minutes, unit: "minutes" };
}
