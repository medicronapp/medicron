import { toLocalInput } from "@medicron/shared";
import { now } from "@/lib/clock";

const pad = (n: number) => String(n).padStart(2, "0");

/** Hoje em Brasília, "YYYY-MM-DD". */
export const todayLocal = () => toLocalInput(now()).slice(0, 10);
/** Agora em Brasília, "YYYY-MM-DDTHH:mm". */
export const nowLocal = () => toLocalInput(now());

// Os seletores nativos trabalham com o relógio do aparelho: o valor trafega como texto sem fuso (relógio de
// Brasília) e vira uma Date só para alimentar o seletor, lida de volta pelos mesmos campos locais.
export function dateFromParts(date: string, time = "12:00"): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(y, (mo || 1) - 1, d || 1, h || 0, mi || 0);
}
export const datePart = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const timePart = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
/** "2026-11-08" → "08/11/2026". */
export const brDate = (date: string) => date.split("-").reverse().join("/");
