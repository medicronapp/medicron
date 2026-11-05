import { describe, test, expect } from "vitest";
import { nextSlotAfter, firstDueAt, isPlanLive, INTERVAL_PRESETS } from "@/lib/schedule";

const d = (s: string) => new Date(s);
const anchor = d("2026-11-04T08:00:00Z");

describe("nextSlotAfter", () => {
  test("slot exatamente em after avança para o próximo", () => {
    expect(nextSlotAfter(anchor, 480, anchor)).toEqual(d("2026-11-04T16:00:00Z"));
  });
  test("antes da âncora devolve a âncora", () => {
    expect(nextSlotAfter(anchor, 480, d("2026-11-04T07:00:00Z"))).toEqual(anchor);
  });
  test("dias depois cai no próximo múltiplo", () => {
    expect(nextSlotAfter(anchor, 480, d("2026-11-07T10:00:00Z"))).toEqual(d("2026-11-07T16:00:00Z"));
  });
  test("intervalo <= 0 lança RangeError", () => {
    expect(() => nextSlotAfter(anchor, 0, anchor)).toThrow(RangeError);
  });
});

describe("firstDueAt", () => {
  test("âncora no futuro é a primeira dose", () => {
    expect(firstDueAt(anchor, 480, d("2026-11-04T07:00:00Z"))).toEqual(anchor);
  });
  test("âncora igual a now conta como devida agora", () => {
    expect(firstDueAt(anchor, 480, anchor)).toEqual(anchor);
  });
  test("âncora no passado usa o próximo slot futuro", () => {
    expect(firstDueAt(anchor, 480, d("2026-11-04T09:00:00Z"))).toEqual(d("2026-11-04T16:00:00Z"));
  });
});

describe("isPlanLive", () => {
  test("inativo não é vivo", () => {
    expect(isPlanLive({ active: false, endAt: null }, anchor)).toBe(false);
  });
  test("slot depois de endAt não é vivo; igual é vivo", () => {
    const endAt = d("2026-11-05T00:00:00Z");
    expect(isPlanLive({ active: true, endAt }, d("2026-11-05T00:00:01Z"))).toBe(false);
    expect(isPlanLive({ active: true, endAt }, endAt)).toBe(true);
  });
  test("sem endAt é vivo", () => {
    expect(isPlanLive({ active: true, endAt: null }, anchor)).toBe(true);
  });
});

test("presets cobrem 4h a 7 dias", () => {
  expect(INTERVAL_PRESETS.map((p) => p.minutes)).toEqual([240, 360, 480, 720, 1440, 2880, 4320, 10080]);
});

import { latestSlotAtOrBefore } from "@/lib/schedule";

describe("latestSlotAtOrBefore", () => {
  test("devolve o slot em curso, inclusive quando at é exatamente um slot", () => {
    expect(latestSlotAtOrBefore(anchor, 480, d("2026-11-04T16:00:00Z"))).toEqual(d("2026-11-04T16:00:00Z"));
    expect(latestSlotAtOrBefore(anchor, 480, d("2026-11-04T23:59:00Z"))).toEqual(d("2026-11-04T16:00:00Z"));
  });
  test("antes da âncora devolve null", () => {
    expect(latestSlotAtOrBefore(anchor, 480, d("2026-11-04T07:59:00Z"))).toBeNull();
  });
});

import { slotsBetween } from "@/lib/schedule";

describe("slotsBetween", () => {
  const z = (s: string) => new Date(`2026-11-04T${s}:00Z`);
  test("lista a grade dentro do intervalo, extremos incluídos", () => {
    expect(slotsBetween(z("11:00"), 360, z("11:00"), z("23:00"))).toEqual([z("11:00"), z("17:00"), z("23:00")]);
  });
  test("from entre slots começa no próximo; antes da âncora começa na âncora", () => {
    expect(slotsBetween(z("11:00"), 360, z("12:00"), z("23:00"))).toEqual([z("17:00"), z("23:00")]);
    expect(slotsBetween(z("11:00"), 360, z("01:00"), z("12:00"))).toEqual([z("11:00")]);
  });
  test("limit corta e from > to devolve vazio", () => {
    expect(slotsBetween(z("11:00"), 60, z("11:00"), z("23:00"), 3)).toHaveLength(3);
    expect(slotsBetween(z("11:00"), 60, z("12:00"), z("11:00"))).toEqual([]);
  });
  test("intervalo inválido lança RangeError", () => {
    expect(() => slotsBetween(z("11:00"), 0, z("11:00"), z("12:00"))).toThrow(RangeError);
  });
});
