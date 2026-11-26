import { describe, expect, test } from "vitest";
import {
  DURATION_DAYS, FREQUENCY_CHIPS, TIME_SHORTCUTS, dayLabel, dosesPerDayLabel, durationDaysFor, endOfDurationLocal,
  firstDoseAt, frequencyChipFor, routineSummary, upcomingDoses,
} from "../src";

const d = (iso: string) => new Date(iso);

describe("frequência por atalhos", () => {
  test("cada atalho tem uma frequência única (nunca dois botões marcados ao mesmo tempo)", () => {
    const minutes = FREQUENCY_CHIPS.map((c) => c.minutes);
    expect(new Set(minutes).size).toBe(minutes.length);
    expect(FREQUENCY_CHIPS.map((c) => c.label)).toEqual([
      "1x ao dia", "2x ao dia", "3x ao dia", "A cada 4 h", "A cada 6 h", "Dia sim, dia não", "Toda semana",
    ]);
  });
  test("2x ao dia é de 12 em 12 h e 3x ao dia é de 8 em 8 h", () => {
    expect(FREQUENCY_CHIPS.find((c) => c.label === "2x ao dia")?.minutes).toBe(720);
    expect(FREQUENCY_CHIPS.find((c) => c.label === "3x ao dia")?.minutes).toBe(480);
  });
  test("frequencyChipFor acha o atalho pelos minutos; fora dos atalhos devolve null", () => {
    expect(frequencyChipFor(240)?.label).toBe("A cada 4 h");
    expect(frequencyChipFor(2880)?.label).toBe("Dia sim, dia não");
    expect(frequencyChipFor(90)).toBeNull();
    expect(frequencyChipFor(360 * 2)).toBe(frequencyChipFor(720));
  });
  test("doses por dia: só quando o intervalo divide o dia", () => {
    expect(dosesPerDayLabel(240)).toBe("6 doses por dia");
    expect(dosesPerDayLabel(480)).toBe("3 doses por dia");
    expect(dosesPerDayLabel(1440)).toBe("1 dose por dia");
    expect(dosesPerDayLabel(2880)).toBeNull();
    expect(dosesPerDayLabel(500)).toBeNull();
  });
});

describe("primeira dose", () => {
  const now = d("2026-11-26T17:05:30.000Z"); // 14:05:30 em Brasília
  test("'agora' é o próximo minuto cheio (nunca no passado, para a dose não pular para a próxima)", () => {
    expect(firstDoseAt("now", now)).toBe("2026-11-26T14:06");
  });
  test("'agora' exatamente no minuto cheio mantém o próprio minuto", () => {
    expect(firstDoseAt("now", d("2026-11-26T17:05:00.000Z"))).toBe("2026-11-26T14:05");
  });
  test("'próxima hora cheia' é a hora seguinte; na hora exata, ela mesma", () => {
    expect(firstDoseAt("nextHour", now)).toBe("2026-11-26T15:00");
    expect(firstDoseAt("nextHour", d("2026-11-26T18:00:00.000Z"))).toBe("2026-11-26T15:00");
  });
  test("atalhos de horário", () => {
    expect(TIME_SHORTCUTS).toEqual([
      { label: "Manhã 08:00", time: "08:00" }, { label: "Almoço 12:00", time: "12:00" }, { label: "Noite 20:00", time: "20:00" },
    ]);
  });
});

describe("duração", () => {
  test("atalhos de dias", () => expect(DURATION_DAYS).toEqual([3, 5, 7, 10, 14, 30]));
  test("7 dias a partir de 26/11 termina no fim de 02/12 (o dia de início conta como o 1º)", () => {
    expect(endOfDurationLocal("2026-11-26T14:05", 7)).toBe("2026-12-02T23:59");
    expect(endOfDurationLocal("2026-11-26T14:05", 1)).toBe("2026-11-26T23:59");
    expect(endOfDurationLocal("2026-12-30T08:00", 5)).toBe("2027-01-03T23:59");
  });
  test("durationDaysFor reconhece uma data final de atalho e devolve null para outra data", () => {
    expect(durationDaysFor("2026-11-26T14:05", "2026-12-02T23:59")).toBe(7);
    expect(durationDaysFor("2026-11-26T14:05", "2026-12-03T10:00")).toBeNull();
    expect(durationDaysFor("2026-11-26T14:05", "2026-11-28T23:59")).toBe(3);
    expect(durationDaysFor("2026-11-26T14:05", "2026-12-26T23:59")).toBeNull(); // 31 dias não é atalho
  });
});

describe("próximas doses", () => {
  const anchor = d("2026-11-26T17:05:00.000Z"); // 14:05
  test("segue a grade a partir do primeiro horário, limitado ao pedido", () => {
    const out = upcomingDoses({ anchor, intervalMinutes: 240, endAt: null, from: anchor, limit: 5 });
    expect(out.map((x) => x.toISOString())).toEqual([
      "2026-11-26T17:05:00.000Z", "2026-11-26T21:05:00.000Z", "2026-11-27T01:05:00.000Z", "2026-11-27T05:05:00.000Z", "2026-11-27T09:05:00.000Z",
    ]);
  });
  test("para na data final", () => {
    const out = upcomingDoses({ anchor, intervalMinutes: 1440, endAt: d("2026-11-28T02:59:00.000Z"), from: anchor, limit: 5 });
    expect(out).toHaveLength(2); // 26/11 e 27/11 (28/11 14:05 já passou da data final)
  });
  test("intervalos grandes (1 ano) ainda devolvem o pedido", () => {
    expect(upcomingDoses({ anchor, intervalMinutes: 525600, endAt: null, from: anchor, limit: 3 })).toHaveLength(3);
  });
});

describe("rótulo do dia e resumo", () => {
  const now = d("2026-11-26T17:05:00.000Z");
  test("hoje, amanhã ou dd/mm (sempre em Brasília)", () => {
    expect(dayLabel(d("2026-11-26T21:05:00.000Z"), now)).toBe("hoje");
    expect(dayLabel(d("2026-11-27T01:05:00.000Z"), now)).toBe("hoje"); // 01:05Z é 22:05 de 26/11 em Brasília
    expect(dayLabel(d("2026-11-27T05:05:00.000Z"), now)).toBe("amanhã");
    expect(dayLabel(d("2026-12-02T05:05:00.000Z"), now)).toBe("02/12");
  });
  test("resumo em uma frase", () => {
    expect(routineSummary({ name: "Limpeza do ferimento", intervalMinutes: 240, duration: { days: 7 } })).toBe("Limpeza do ferimento, a cada 4 horas, por 7 dias");
    expect(routineSummary({ name: "Dipirona", intervalMinutes: 1440, duration: null })).toBe("Dipirona, 1 vez ao dia, uso contínuo");
    expect(routineSummary({ name: "Dipirona", intervalMinutes: 720, duration: { until: "02/12" } })).toBe("Dipirona, a cada 12 horas, até 02/12");
    expect(routineSummary({ name: "", intervalMinutes: 480, duration: null })).toBe("A cada 8 horas, uso contínuo");
    expect(routineSummary({ name: "X", intervalMinutes: 480, duration: { days: 1 } })).toBe("X, a cada 8 horas, por 1 dia");
  });
});
