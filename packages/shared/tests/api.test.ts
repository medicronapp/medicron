import { describe, expect, test } from "vitest";
import { API_PREFIX, doseBody, itemBody, patientBody, planCreateBody, planPatchBody } from "../src";

describe("schemas de corpo da API", () => {
  test("prefixo da API", () => {
    expect(API_PREFIX).toBe("/api/v1");
  });
  test("paciente", () => {
    expect(patientBody.parse({ name: "Izzy", species: "cat" }).name).toBe("Izzy");
    expect(patientBody.safeParse({ name: "", species: "cat" }).success).toBe(false);
    expect(patientBody.safeParse({ name: "X", species: "dragon" }).success).toBe(false);
    expect(patientBody.safeParse({ name: "X", species: "cat", weightKg: 501 }).success).toBe(false);
  });
  test("item", () => {
    expect(itemBody.safeParse({ name: "Agemoxi", kind: "medication" }).success).toBe(true);
    expect(itemBody.safeParse({ name: "Agemoxi", kind: "other" }).success).toBe(false);
  });
  test("rotina: criação e alteração", () => {
    const base = { itemId: "i1", intervalMinutes: 480, anchorAt: "2026-11-06T12:00:00.000Z" };
    expect(planCreateBody.safeParse(base).success).toBe(true);
    expect(planCreateBody.safeParse({ ...base, intervalMinutes: 1 }).success).toBe(false);
    expect(planCreateBody.safeParse({ ...base, anchorAt: "amanhã" }).success).toBe(false);
    expect(planPatchBody.safeParse({ endAt: null, reschedule: true }).success).toBe(true);
    expect(planPatchBody.safeParse({ endAt: "2026-12-01T00:00:00.000Z" }).success).toBe(true);
  });
  test("dose", () => {
    const ok = { planId: "p", scheduledFor: "2026-11-06T12:00:00.000Z", outcome: "done" };
    expect(doseBody.safeParse(ok).success).toBe(true);
    expect(doseBody.safeParse({ ...ok, outcome: "later" }).success).toBe(false);
    expect(doseBody.safeParse({ ...ok, appliedAt: "2026-11-06T12:20:00.000Z" }).success).toBe(true);
  });
});
