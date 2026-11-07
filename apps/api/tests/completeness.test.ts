import { describe, test, expect } from "vitest";
import { dayStatus, computeStreak, type SlotFacts, type DayStatus } from "@/lib/completeness";

const z = (s: string) => new Date(s);
const done = (at: string, resolvedAt: string): SlotFacts => ({ scheduledFor: z(at), outcome: "done", resolvedAt: z(resolvedAt) });
const skipped = (at: string, resolvedAt: string): SlotFacts => ({ scheduledFor: z(at), outcome: "skipped", resolvedAt: z(resolvedAt) });
const open = (at: string): SlotFacts => ({ scheduledFor: z(at), outcome: null, resolvedAt: null });

describe("dayStatus (dia 2026-11-04)", () => {
  const key = "2026-11-04";
  const now = z("2026-11-04T23:00:00Z");
  test("sem cuidados é empty", () => expect(dayStatus([], key, now)).toBe("empty"));
  test("tudo resolvido na janela é ok, e pulado conta", () => {
    expect(dayStatus([done("2026-11-04T11:00:00Z", "2026-11-04T11:05:00Z")], key, now)).toBe("ok");
    expect(dayStatus([skipped("2026-11-04T11:00:00Z", "2026-11-04T11:05:00Z")], key, now)).toBe("ok");
  });
  test("não resolvido hoje é open", () => {
    expect(dayStatus([open("2026-11-05T01:00:00Z")], key, now)).toBe("open");
  });
  test("não resolvido ontem, ainda na janela, é pending", () => {
    expect(dayStatus([open("2026-11-04T17:00:00Z")], key, z("2026-11-05T13:00:00Z"))).toBe("pending");
  });
  test("não resolvido depois da janela é lost", () => {
    expect(dayStatus([open("2026-11-04T17:00:00Z")], key, z("2026-11-06T03:00:00Z"))).toBe("lost");
  });
  test("borda da janela: 23:59:59.999 do dia seguinte conserta; 1 ms depois perde", () => {
    const at = "2026-11-04T17:00:00Z";
    expect(dayStatus([done(at, "2026-11-06T02:59:59.999Z")], key, z("2026-11-07T12:00:00Z"))).toBe("ok");
    expect(dayStatus([done(at, "2026-11-06T03:00:00.000Z")], key, z("2026-11-07T12:00:00Z"))).toBe("lost");
  });
  test("cuidado das 23:30 BRT (02:30Z) pertence ao dia certo para quem chama com a chave", () => {
    expect(dayStatus([open("2026-11-05T02:30:00Z")], "2026-11-04", z("2026-11-05T01:00:00Z"))).toBe("open");
  });
});

describe("computeStreak (hoje 2026-11-04)", () => {
  const today = "2026-11-04";
  const m = (o: Record<string, DayStatus>) => new Map(Object.entries(o));
  test("hoje aberto não soma nem quebra", () => {
    expect(computeStreak(m({ "2026-11-04": "open", "2026-11-03": "ok", "2026-11-02": "ok", "2026-11-01": "ok" }), today, "2026-11-01"))
      .toEqual({ days: 3, atRisk: false, pendingKeys: [] });
  });
  test("hoje ok soma 1", () => {
    expect(computeStreak(m({ "2026-11-04": "ok", "2026-11-03": "ok" }), today, "2026-11-03").days).toBe(2);
  });
  test("lost encerra a contagem", () => {
    const s = m({ "2026-11-04": "ok", "2026-11-03": "lost", "2026-11-02": "ok" });
    expect(computeStreak(s, today, "2026-11-02").days).toBe(1);
    expect(computeStreak(m({ "2026-11-04": "open", "2026-11-03": "lost", "2026-11-02": "ok" }), today, "2026-11-02").days).toBe(0);
  });
  test("pending ontem marca risco e preserva a sequência anterior", () => {
    expect(computeStreak(m({ "2026-11-04": "open", "2026-11-03": "pending", "2026-11-02": "ok", "2026-11-01": "ok" }), today, "2026-11-01"))
      .toEqual({ days: 2, atRisk: true, pendingKeys: ["2026-11-03"] });
  });
  test("dias vazios não quebram nem somam", () => {
    expect(computeStreak(m({ "2026-11-04": "ok", "2026-11-02": "ok" }), today, "2026-11-01").days).toBe(2);
  });
  test("para em earliestKey e mapa vazio dá zero", () => {
    expect(computeStreak(m({ "2026-11-04": "ok", "2026-11-03": "ok", "2026-11-02": "ok" }), today, "2026-11-03").days).toBe(2);
    expect(computeStreak(new Map(), today, "2026-11-04").days).toBe(0);
  });
});
