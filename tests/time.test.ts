import { describe, test, expect } from "vitest";
import { parseLocalInput, toLocalInput, formatDateTime, intervalLabel, localTimeToRecent } from "@/lib/time";

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

import { dayKey, dayBounds, addDays, windowEnd, weekKeys, weekdayShort } from "@/lib/time";

describe("dia em Brasília", () => {
  test("dayKey vira o dia às 03:00Z", () => {
    expect(dayKey(new Date("2026-11-05T02:59:59Z"))).toBe("2026-11-04");
    expect(dayKey(new Date("2026-11-05T03:00:00Z"))).toBe("2026-11-05");
  });
  test("dayBounds cobre 00:00:00.000 a 23:59:59.999 BRT", () => {
    const b = dayBounds("2026-11-04");
    expect(b.start).toEqual(new Date("2026-11-04T03:00:00.000Z"));
    expect(b.end).toEqual(new Date("2026-11-05T02:59:59.999Z"));
  });
  test("addDays atravessa mês e fevereiro", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  test("windowEnd é o fim do dia seguinte", () => {
    expect(windowEnd("2026-11-04")).toEqual(new Date("2026-11-06T02:59:59.999Z"));
  });
  test("weekKeys vai de segunda a domingo", () => {
    expect(weekKeys("2026-11-04")).toEqual(["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"]);
    expect(weekKeys("2026-11-08")[0]).toBe("2026-11-02");
    expect(weekKeys("2026-11-02")[0]).toBe("2026-11-02");
  });
  test("weekdayShort em português", () => {
    expect(weekdayShort("2026-11-04")).toBe("qua");
    expect(weekdayShort("2026-11-07")).toBe("sáb");
    expect(weekdayShort("2026-11-08")).toBe("dom");
  });
});

describe("localTimeToRecent", () => {
  test("hora de hoje em Brasília quando já passou", () => {
    expect(localTimeToRecent("09:30", new Date("2026-11-04T15:00:00Z"))).toEqual(new Date("2026-11-04T12:30:00Z"));
  });
  test("hora que ainda não chegou vira a de ontem", () => {
    expect(localTimeToRecent("23:50", new Date("2026-11-05T03:10:00Z"))).toEqual(new Date("2026-11-05T02:50:00Z"));
  });
});
