import { describe, expect, test } from "vitest";
import { FREE_LIMITS, PLUS_ENTITLEMENT, PLUS_LIMITS, PRODUCT_IDS, historyCutoffKey, limitsFor } from "../src/subscription";

describe("limites do grátis e do Plus", () => {
  test("grátis: 2 pacientes, 2 pessoas na conta e 30 dias de histórico", () => {
    expect(limitsFor("free")).toEqual({ patients: 2, members: 2, historyDays: 30 });
    expect(FREE_LIMITS).toEqual(limitsFor("free"));
  });

  test("Plus: pacientes e histórico ilimitados (null) e até 8 pessoas", () => {
    expect(limitsFor("plus")).toEqual({ patients: null, members: 8, historyDays: null });
    expect(PLUS_LIMITS).toEqual(limitsFor("plus"));
  });

  test("o Plus nunca tem menos que o grátis (guarda contra inverter os limites)", () => {
    expect(PLUS_LIMITS.members).toBeGreaterThanOrEqual(FREE_LIMITS.members);
    expect(PLUS_LIMITS.patients).toBeNull();
    expect(PLUS_LIMITS.historyDays).toBeNull();
    expect(FREE_LIMITS.patients).not.toBeNull();
    expect(FREE_LIMITS.historyDays).not.toBeNull();
  });
});

describe("historyCutoffKey (o dia mais antigo que o grátis pode ver)", () => {
  test("grátis: 30 dias antes de hoje", () => {
    expect(historyCutoffKey("2026-11-10", "free")).toBe("2026-10-11");
  });
  test("atravessa virada de mês e de ano", () => {
    expect(historyCutoffKey("2026-01-05", "free")).toBe("2025-12-06");
    expect(historyCutoffKey("2026-03-01", "free")).toBe("2026-01-30");
  });
  test("Plus não tem corte (null)", () => {
    expect(historyCutoffKey("2026-11-10", "plus")).toBeNull();
  });
});

describe("identificadores fixos das lojas e do RevenueCat", () => {
  test("entitlement e produtos", () => {
    expect(PLUS_ENTITLEMENT).toBe("plus");
    expect(PRODUCT_IDS).toEqual({ monthly: "app.medicron.plus.monthly", annual: "app.medicron.plus.annual" });
  });
});
