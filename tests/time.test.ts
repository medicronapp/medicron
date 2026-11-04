import { test, expect } from "vitest";
import { parseLocalInput, toLocalInput, formatDateTime, intervalLabel } from "@/lib/time";

test("parseLocalInput interpreta datetime-local em America/Sao_Paulo", () => {
  expect(parseLocalInput("2026-11-04T08:00")).toEqual(new Date("2026-11-04T11:00:00Z"));
});

test("toLocalInput é o inverso de parseLocalInput", () => {
  expect(toLocalInput(new Date("2026-11-04T11:00:00Z"))).toBe("2026-11-04T08:00");
});

test("formatDateTime mostra horário de Brasília em pt-BR", () => {
  expect(formatDateTime(new Date("2026-11-04T11:00:00Z"))).toMatch(/04\/11.*08:00/);
});

test("intervalLabel descreve minutos em horas/dias", () => {
  expect(intervalLabel(480)).toBe("A cada 8 horas");
  expect(intervalLabel(1440)).toBe("1 vez ao dia");
  expect(intervalLabel(90)).toBe("A cada 90 minutos");
  expect(intervalLabel(4320)).toBe("A cada 3 dias");
});

test("nextQuarterHourInput arredonda para cima ao quarto de hora em Brasília", async () => {
  const { nextQuarterHourInput } = await import("@/lib/time");
  expect(nextQuarterHourInput(new Date("2026-11-04T11:07:00Z"))).toBe("2026-11-04T08:15");
  expect(nextQuarterHourInput(new Date("2026-11-04T11:15:00Z"))).toBe("2026-11-04T08:15");
});
