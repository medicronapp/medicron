import { describe, test, expect } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { user } from "@/lib/db/schema";
import { createCat, archiveCat } from "@/lib/services/cats";
import { createItem } from "@/lib/services/items";
import { createPlan, deactivatePlan } from "@/lib/services/plans";
import { resolveSlot } from "@/lib/services/slots";
import { getHome } from "@/lib/services/home";

const z = (s: string) => new Date(s);
type TestDb = Awaited<ReturnType<typeof createTestDb>>;

async function base() {
  const db = await createTestDb();
  await db.insert(user).values([{ id: "u1", name: "Ana", email: "a@x.com" }, { id: "u2", name: "Bia", email: "b@x.com" }]);
  return db;
}
async function addPlan(db: TestDb, catName: string, o: { interval: number; anchor: string; createdAt: string; itemName?: string }) {
  const cat = await createCat(db, "o1", { name: catName });
  const item = await createItem(db, "o1", { name: o.itemName ?? "Amoxicilina", kind: "medication" });
  const plan = await createPlan(db, "o1", {
    catId: cat.id, itemId: item.id, intervalMinutes: o.interval, anchorAt: z(o.anchor), now: z(o.createdAt),
  });
  return { cat, item, plan };
}
const res = (db: TestDb, planId: string, slot: string, now: string, outcome: "done" | "skipped" = "done", userId = "u1") =>
  resolveSlot(db, "o1", userId, { planId, scheduledFor: z(slot), outcome, now: z(now) });

describe("getHome — dia de hoje", () => {
  test("exemplo 1: Izzy com feito, sem registro e agora; dia não fechado; atenção em ordem", async () => {
    const db = await base();
    const { plan } = await addPlan(db, "Izzy", { interval: 360, anchor: "2026-11-04T11:00:00Z", createdAt: "2026-11-04T10:00:00Z" });
    await res(db, plan.id, "2026-11-04T11:00:00Z", "2026-11-04T11:03:00Z");
    const h = await getHome(db, "o1", z("2026-11-04T23:05:00Z"));
    expect(h.todayKey).toBe("2026-11-04");
    expect(h.cats).toHaveLength(1);
    expect(h.cats[0]).toMatchObject({ catName: "Izzy", total: 3, resolved: 1, missed: 1 });
    expect(h.cats[0].entries.map((e) => e.state)).toEqual(["done", "missed", "now"]);
    expect(h.cats[0].entries[0]).toMatchObject({ resolvedBy: "Ana", late: false, itemName: "Amoxicilina" });
    expect(h.attention.map((e) => e.scheduledFor.toISOString())).toEqual(["2026-11-04T17:00:00.000Z", "2026-11-04T23:00:00.000Z"]);
    expect(h.progress).toEqual({ resolved: 1, total: 3 });
    expect(h.closedToday).toBe(false);
    expect(h.week.find((d) => d.isToday)?.status).toBe("open");
  });

  test("exemplo 3: pulado conta como resolvido; ao resolver tudo o dia fecha e a sequência sobe", async () => {
    const db = await base();
    const { plan } = await addPlan(db, "Izzy", { interval: 360, anchor: "2026-11-04T11:00:00Z", createdAt: "2026-11-04T10:00:00Z" });
    await res(db, plan.id, "2026-11-04T11:00:00Z", "2026-11-04T11:03:00Z");
    await res(db, plan.id, "2026-11-04T17:00:00Z", "2026-11-04T17:03:00Z", "skipped");
    await res(db, plan.id, "2026-11-04T23:00:00Z", "2026-11-04T23:03:00Z");
    const h = await getHome(db, "o1", z("2026-11-04T23:10:00Z"));
    expect(h.closedToday).toBe(true);
    expect(h.streak).toMatchObject({ days: 1, atRisk: false });
    expect(h.attention).toEqual([]);
    expect(h.cats[0].entries.map((e) => e.state)).toEqual(["done", "skipped", "done"]);
  });

  test("exemplo 7: dois gatos; sem registro em qualquer um impede o fechamento; gato com pendência vem primeiro", async () => {
    const db = await base();
    const a = await addPlan(db, "Izzy", { interval: 720, anchor: "2026-11-04T11:00:00Z", createdAt: "2026-11-04T10:00:00Z" });
    const b = await addPlan(db, "Bigodes", { interval: 720, anchor: "2026-11-04T11:00:00Z", createdAt: "2026-11-04T10:00:00Z", itemName: "Gaba" });
    await res(db, a.plan.id, "2026-11-04T11:00:00Z", "2026-11-04T11:02:00Z");
    await res(db, a.plan.id, "2026-11-04T23:00:00Z", "2026-11-04T23:02:00Z");
    await res(db, b.plan.id, "2026-11-04T23:00:00Z", "2026-11-04T23:02:00Z");
    const h = await getHome(db, "o1", z("2026-11-04T23:10:00Z"));
    expect(h.closedToday).toBe(false);
    expect(h.cats.map((c) => c.catName)).toEqual(["Bigodes", "Izzy"]);
    expect(h.cats[0].missed).toBe(1);
  });

  test("dois gatos com o mesmo nome continuam separados", async () => {
    const db = await base();
    await addPlan(db, "Izzy", { interval: 720, anchor: "2026-11-04T11:00:00Z", createdAt: "2026-11-04T10:00:00Z" });
    await addPlan(db, "Izzy", { interval: 720, anchor: "2026-11-04T11:00:00Z", createdAt: "2026-11-04T10:00:00Z", itemName: "Outro" });
    const h = await getHome(db, "o1", z("2026-11-04T12:00:00Z"));
    expect(h.cats).toHaveLength(2);
  });

  test("12 pendências ficam todas em atenção, da mais antiga à mais nova (o corte em 5 é da UI)", async () => {
    const db = await base();
    await addPlan(db, "Izzy", { interval: 60, anchor: "2026-11-04T03:00:00Z", createdAt: "2026-11-04T02:00:00Z" });
    const h = await getHome(db, "o1", z("2026-11-04T15:00:00Z"));
    expect(h.attention).toHaveLength(13);
    expect(h.attention[0].scheduledFor).toEqual(z("2026-11-04T03:00:00Z"));
    expect(h.attention.filter((e) => e.state === "missed")).toHaveLength(12);
  });

  test("cuidado das 23:30 BRT (02:30Z) aparece no dia certo e o das 00:30 BRT no seguinte", async () => {
    const db = await base();
    await addPlan(db, "Izzy", { interval: 1440, anchor: "2026-11-05T02:30:00Z", createdAt: "2026-11-04T10:00:00Z" });
    const hoje = await getHome(db, "o1", z("2026-11-05T02:00:00Z"));
    expect(hoje.todayKey).toBe("2026-11-04");
    expect(hoje.cats[0].entries.map((e) => e.state)).toEqual(["later"]);
    const amanha = await getHome(db, "o1", z("2026-11-05T12:00:00Z"), "2026-11-04");
    expect(amanha.cats[0].entries[0].scheduledFor).toEqual(z("2026-11-05T02:30:00Z"));
  });
});

describe("getHome — sequência e janela de solução", () => {
  async function tres() {
    const db = await base();
    const { plan } = await addPlan(db, "Izzy", { interval: 720, anchor: "2026-11-02T11:00:00Z", createdAt: "2026-11-02T10:00:00Z" });
    await res(db, plan.id, "2026-11-02T11:00:00Z", "2026-11-02T11:02:00Z");
    await res(db, plan.id, "2026-11-02T23:00:00Z", "2026-11-02T23:02:00Z");
    await res(db, plan.id, "2026-11-03T11:00:00Z", "2026-11-03T11:02:00Z");
    return { db, plan };
  }

  test("exemplo 4: ontem pendente deixa a sequência em risco; resolver dentro da janela conserta", async () => {
    const { db, plan } = await tres();
    const antes = await getHome(db, "o1", z("2026-11-04T13:00:00Z"));
    expect(antes.streak).toMatchObject({ days: 1, atRisk: true });
    expect(antes.week.find((d) => d.key === "2026-11-03")?.status).toBe("pending");
    expect(antes.attention.map((e) => e.scheduledFor.toISOString())).toContain("2026-11-03T23:00:00.000Z");
    await res(db, plan.id, "2026-11-03T23:00:00Z", "2026-11-04T13:10:00Z");
    const depois = await getHome(db, "o1", z("2026-11-04T13:20:00Z"));
    expect(depois.streak).toMatchObject({ days: 2, atRisk: false });
    expect(depois.week.find((d) => d.key === "2026-11-03")?.status).toBe("ok");
  });

  test("exemplo 4b: resolver só depois da janela grava como 'registrada depois' e o dia continua perdido", async () => {
    const { db, plan } = await tres();
    await res(db, plan.id, "2026-11-04T11:00:00Z", "2026-11-04T11:02:00Z");
    await res(db, plan.id, "2026-11-04T23:00:00Z", "2026-11-04T23:02:00Z");
    const perdido = await getHome(db, "o1", z("2026-11-05T12:00:00Z"));
    expect(perdido.week.find((d) => d.key === "2026-11-03")?.status).toBe("lost");
    expect(perdido.streak.days).toBe(1);
    expect(perdido.attention.map((e) => e.scheduledFor.toISOString())).not.toContain("2026-11-03T23:00:00.000Z");
    await res(db, plan.id, "2026-11-03T23:00:00Z", "2026-11-05T12:30:00Z");
    const depois = await getHome(db, "o1", z("2026-11-05T12:40:00Z"), "2026-11-03");
    expect(depois.selectedStatus).toBe("lost");
    expect(depois.streak.days).toBe(1);
    expect(depois.cats[0].entries.find((e) => e.state === "done" && e.late)).toBeTruthy();
  });

  test("selectedKey de ontem devolve os cuidados daquele dia", async () => {
    const { db } = await tres();
    const h = await getHome(db, "o1", z("2026-11-04T13:00:00Z"), "2026-11-03");
    expect(h.selectedKey).toBe("2026-11-03");
    expect(h.cats[0].entries.map((e) => e.state)).toEqual(["done", "missed"]);
  });

  test("chave inválida ou futura volta para hoje", async () => {
    const { db } = await tres();
    expect((await getHome(db, "o1", z("2026-11-04T13:00:00Z"), "lixo")).selectedKey).toBe("2026-11-04");
    expect((await getHome(db, "o1", z("2026-11-04T13:00:00Z"), "2026-12-01")).selectedKey).toBe("2026-11-04");
  });

  test("exemplo 8: dia sem cuidados não aparece como falha nem zera a sequência", async () => {
    const db = await base();
    const { plan } = await addPlan(db, "Izzy", { interval: 10080, anchor: "2026-11-04T11:00:00Z", createdAt: "2026-11-04T10:00:00Z" });
    await res(db, plan.id, "2026-11-04T11:00:00Z", "2026-11-04T11:02:00Z");
    const h = await getHome(db, "o1", z("2026-11-05T15:00:00Z"));
    expect(h.week.find((d) => d.key === "2026-11-05")?.status).toBe("empty");
    expect(h.streak.days).toBe(1);
    expect(h.cats).toEqual([]);
  });

  test("a semana vai de segunda a domingo, com dias futuros marcados", async () => {
    const db = await base();
    const h = await getHome(db, "o1", z("2026-11-04T15:00:00Z"));
    expect(h.week.map((d) => d.key)[0]).toBe("2026-11-02");
    expect(h.week.map((d) => d.status).slice(3)).toEqual(["future", "future", "future", "future"]);
  });
});

describe("getHome — sem fantasmas", () => {
  test("rotina encerrada: horário futuro não resolvido de hoje não bloqueia o fechamento", async () => {
    const db = await base();
    const { plan } = await addPlan(db, "Izzy", { interval: 720, anchor: "2026-11-04T11:00:00Z", createdAt: "2026-11-04T10:00:00Z" });
    await res(db, plan.id, "2026-11-04T11:00:00Z", "2026-11-04T11:02:00Z");
    await deactivatePlan(db, "o1", plan.id);
    const h = await getHome(db, "o1", z("2026-11-04T13:00:00Z"));
    expect(h.closedToday).toBe(true);
    expect(h.cats[0].entries).toHaveLength(1);
  });

  test("gato arquivado some de abas, atenção e cálculo", async () => {
    const db = await base();
    const { cat } = await addPlan(db, "Izzy", { interval: 720, anchor: "2026-11-04T11:00:00Z", createdAt: "2026-11-04T10:00:00Z" });
    await getHome(db, "o1", z("2026-11-04T13:00:00Z"));
    await archiveCat(db, "o1", cat.id);
    const h = await getHome(db, "o1", z("2026-11-04T13:00:00Z"));
    expect(h.cats).toEqual([]);
    expect(h.attention).toEqual([]);
    expect(h.progress.total).toBe(0);
  });

  test("não mostra cuidados de outra conta", async () => {
    const db = await base();
    await addPlan(db, "Izzy", { interval: 720, anchor: "2026-11-04T11:00:00Z", createdAt: "2026-11-04T10:00:00Z" });
    const h = await getHome(db, "o2", z("2026-11-04T13:00:00Z"));
    expect(h.cats).toEqual([]);
  });

  test("C1: rotina encerrada às 10:00 não vira 'sem registro' quando o horário das 20:00 passa", async () => {
    const db = await base();
    const { plan } = await addPlan(db, "Izzy", { interval: 720, anchor: "2026-11-04T11:00:00Z", createdAt: "2026-11-04T10:00:00Z" });
    await res(db, plan.id, "2026-11-04T11:00:00Z", "2026-11-04T11:02:00Z");
    await deactivatePlan(db, "o1", plan.id, z("2026-11-04T13:00:00Z"));
    const h = await getHome(db, "o1", z("2026-11-04T23:16:00Z"));
    expect(h.attention).toEqual([]);
    expect(h.cats[0].entries).toHaveLength(1);
    expect(h.closedToday).toBe(true);
    const amanha = await getHome(db, "o1", z("2026-11-06T12:00:00Z"));
    expect(amanha.week.find((d) => d.key === "2026-11-04")?.status).toBe("ok");
  });
});
