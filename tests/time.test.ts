import { describe, test, expect } from "vitest";
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

import { relativeLabel, formatLongDate } from "@/lib/time";

describe("relativeLabel", () => {
  const now = new Date("2026-11-04T12:00:00Z");
  const at = (ms: number) => new Date(now.getTime() + ms);
  const MIN = 60_000, H = 3_600_000, D = 86_400_000;
  test("agora quando a diferença é menor que 1 minuto", () => {
    expect(relativeLabel(at(30_000), now)).toBe("agora");
    expect(relativeLabel(at(-30_000), now)).toBe("agora");
  });
  test("futuro em minutos, horas e dias", () => {
    expect(relativeLabel(at(25 * MIN), now)).toBe("em 25 min");
    expect(relativeLabel(at(2 * H + 10 * MIN), now)).toBe("em 2 h");
    expect(relativeLabel(at(1 * D + 3 * H), now)).toBe("em 1 d");
  });
  test("passado em minutos, horas e dias", () => {
    expect(relativeLabel(at(-25 * MIN), now)).toBe("há 25 min");
    expect(relativeLabel(at(-2 * H), now)).toBe("há 2 h");
    expect(relativeLabel(at(-3 * D), now)).toBe("há 3 d");
  });
});

test("formatLongDate escreve a data por extenso em Brasília", () => {
  expect(formatLongDate(new Date("2026-11-04T15:00:00Z"))).toBe("quarta-feira, 4 de novembro");
});
