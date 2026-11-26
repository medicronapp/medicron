import { INTERVAL_PRESETS } from "@medicron/shared";

/** Valor do seletor para "Personalizada…" (as demais opções usam os minutos do atalho). */
export const CUSTOM_INTERVAL = "0";
export const MIN_INTERVAL_MINUTES = 5;
export const MAX_INTERVAL_MINUTES = 60 * 24 * 365;
export const INTERVAL_ERROR = "Informe um intervalo entre 5 minutos e 1 ano";

/** Estado inicial dos campos de frequência para uma rotina já existente (atalho, ou "Personalizada" com as horas). */
export function initialInterval(minutes: number): { interval: string; customHours: string } {
  if (INTERVAL_PRESETS.some((p) => p.minutes === minutes)) return { interval: String(minutes), customHours: "" };
  return { interval: CUSTOM_INTERVAL, customHours: String(Number((minutes / 60).toFixed(2))).replace(".", ",") };
}

/** Frequência escolhida em minutos, ou `null` se a personalizada for inválida (fora de 5 minutos a 1 ano). */
export function resolveInterval(interval: string, customHours: string): number | null {
  if (interval !== CUSTOM_INTERVAL) return Number(interval);
  const minutes = Math.round(Number(customHours.replace(",", ".")) * 60);
  return Number.isFinite(minutes) && minutes >= MIN_INTERVAL_MINUTES && minutes <= MAX_INTERVAL_MINUTES ? minutes : null;
}
