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
