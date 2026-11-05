export const TZ = "America/Sao_Paulo";
// O Brasil não adota horário de verão desde 2019: Brasília é UTC-3 o ano todo.
const OFFSET = "-03:00";

/** "2026-11-04T08:00" (campo datetime-local, horário de Brasília) -> Date UTC. */
export function parseLocalInput(value: string): Date {
  return new Date(`${value}:00${OFFSET}`);
}

/** Date -> "YYYY-MM-DDTHH:mm" em Brasília, para <input type="datetime-local">. */
export function toLocalInput(date: Date): string {
  return new Date(date.getTime() - 3 * 3600_000).toISOString().slice(0, 16);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(date).replace(",", "");
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(date);
}

export function intervalLabel(minutes: number): string {
  if (minutes === 1440) return "1 vez ao dia";
  if (minutes === 10080) return "1 vez por semana";
  if (minutes % 1440 === 0) return `A cada ${minutes / 1440} dias`;
  if (minutes % 60 === 0) return `A cada ${minutes / 60} horas`;
  return `A cada ${minutes} minutos`;
}

/** Próximo quarto de hora cheio, no formato do datetime-local (Brasília). */
export function nextQuarterHourInput(now: Date = new Date()): string {
  return toLocalInput(new Date(Math.ceil(now.getTime() / 900_000) * 900_000));
}

/** "em 25 min", "há 2 h", "agora" — arredonda para baixo. */
export function relativeLabel(target: Date, now: Date): string {
  const diff = target.getTime() - now.getTime();
  const abs = Math.abs(diff);
  if (abs < 60_000) return "agora";
  const amount =
    abs < 3_600_000 ? `${Math.floor(abs / 60_000)} min`
    : abs < 86_400_000 ? `${Math.floor(abs / 3_600_000)} h`
    : `${Math.floor(abs / 86_400_000)} d`;
  return diff > 0 ? `em ${amount}` : `há ${amount}`;
}

/** "quarta-feira, 4 de novembro" em Brasília. */
export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(date);
}

const BRT_MS = 3 * 3600_000;
const DAY_MS = 86_400_000;
const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** "YYYY-MM-DD" do instante em Brasília. */
export function dayKey(date: Date): string {
  return new Date(date.getTime() - BRT_MS).toISOString().slice(0, 10);
}

/** Início (00:00:00.000) e fim (23:59:59.999) do dia em Brasília. */
export function dayBounds(key: string): { start: Date; end: Date } {
  const start = new Date(`${key}T00:00:00.000-03:00`);
  return { start, end: new Date(start.getTime() + DAY_MS - 1) };
}

export function addDays(key: string, n: number): string {
  const noon = new Date(`${key}T12:00:00.000Z`).getTime() + n * DAY_MS;
  return new Date(noon).toISOString().slice(0, 10);
}

/** Fim da janela de solução: 23:59:59.999 do dia seguinte. */
export function windowEnd(key: string): Date {
  return dayBounds(addDays(key, 1)).end;
}

/** Segunda a domingo da semana que contém `todayKey`. */
export function weekKeys(todayKey: string): string[] {
  const dow = new Date(`${todayKey}T12:00:00.000Z`).getUTCDay(); // 0 = domingo
  const monday = addDays(todayKey, -((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function weekdayShort(key: string): string {
  return WEEKDAYS[new Date(`${key}T12:00:00.000Z`).getUTCDay()];
}
