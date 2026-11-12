import { beforeEach, describe, expect, test } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { organization, orgSubscriptions } from "@/lib/db/schema";
import { applyRevenueCatEvent, type RevenueCatEvent } from "@/lib/services/revenuecat";
import { getSubscription, grantPlus } from "@/lib/services/subscription";
import type { Db } from "@/lib/db";

const NOW = new Date("2026-11-10T15:00:00.000Z");
const DAY = 86_400_000;
let db: Db;
let seq = 0;

beforeEach(async () => {
  db = await createTestDb();
  await db.insert(organization).values({ id: "o1", name: "Casa", slug: "casa", createdAt: NOW });
  seq = 0;
});

/** Evento no formato da documentação do RevenueCat (campos usados: id, type, app_user_id, product_id, store, environment, período, validade, instante). */
function ev(type: string, over: Partial<RevenueCatEvent> = {}): RevenueCatEvent {
  seq += 1;
  return {
    id: `evt-${seq}`, type, app_user_id: "o1", product_id: "app.medicron.plus.annual", store: "APP_STORE",
    environment: "PRODUCTION", period_type: "NORMAL", event_timestamp_ms: NOW.getTime() + seq * 1000,
    expiration_at_ms: NOW.getTime() + 30 * DAY, ...over,
  };
}
const sub = () => getSubscription(db, "o1", NOW);

describe("applyRevenueCatEvent: eventos que concedem", () => {
  test("INITIAL_PURCHASE em teste grátis (period_type TRIAL) concede o Plus até a validade, origem Apple, renova", async () => {
    expect(await applyRevenueCatEvent(db, ev("INITIAL_PURCHASE", { period_type: "TRIAL", expiration_at_ms: NOW.getTime() + 7 * DAY }), NOW)).toBe("applied");
    const s = await sub();
    expect(s).toMatchObject({ tier: "plus", source: "apple", willRenew: true, plusUntil: new Date(NOW.getTime() + 7 * DAY).toISOString() });
  });

  test("RENEWAL estende a validade; produto fica guardado", async () => {
    await applyRevenueCatEvent(db, ev("INITIAL_PURCHASE", { expiration_at_ms: NOW.getTime() + 7 * DAY }), NOW);
    await applyRevenueCatEvent(db, ev("RENEWAL", { expiration_at_ms: NOW.getTime() + 37 * DAY }), NOW);
    expect((await sub()).plusUntil).toBe(new Date(NOW.getTime() + 37 * DAY).toISOString());
    const [row] = await db.select().from(orgSubscriptions);
    expect(row.productId).toBe("app.medicron.plus.annual");
  });

  test("Play Store vira origem Google; ambiente SANDBOX é aceito (testadores e revisão da Apple)", async () => {
    await applyRevenueCatEvent(db, ev("INITIAL_PURCHASE", { store: "PLAY_STORE", environment: "SANDBOX" }), NOW);
    expect(await sub()).toMatchObject({ tier: "plus", source: "google" });
  });

  test("PRODUCT_CHANGE, UNCANCELLATION e REFUND_REVERSED também concedem", async () => {
    for (const t of ["PRODUCT_CHANGE", "UNCANCELLATION", "REFUND_REVERSED", "SUBSCRIPTION_EXTENDED"]) {
      await db.delete(orgSubscriptions);
      expect(await applyRevenueCatEvent(db, ev(t), NOW)).toBe("applied");
      expect((await sub()).tier).toBe("plus");
    }
  });
});

describe("applyRevenueCatEvent: cancelar e expirar", () => {
  test("CANCELLATION mantém o Plus até a validade e marca que não renova", async () => {
    await applyRevenueCatEvent(db, ev("INITIAL_PURCHASE"), NOW);
    await applyRevenueCatEvent(db, ev("CANCELLATION"), NOW);
    expect(await sub()).toMatchObject({ tier: "plus", willRenew: false, plusUntil: new Date(NOW.getTime() + 30 * DAY).toISOString() });
  });

  test("CANCELLATION por reembolso (validade já passou) volta ao grátis", async () => {
    await applyRevenueCatEvent(db, ev("INITIAL_PURCHASE"), NOW);
    await applyRevenueCatEvent(db, ev("CANCELLATION", { expiration_at_ms: NOW.getTime() - 1000 }), NOW);
    expect((await sub()).tier).toBe("free");
  });

  test("EXPIRATION remove o Plus (volta ao grátis), sem apagar a linha", async () => {
    await applyRevenueCatEvent(db, ev("INITIAL_PURCHASE"), NOW);
    await applyRevenueCatEvent(db, ev("EXPIRATION", { expiration_at_ms: NOW.getTime() - 1000 }), NOW);
    expect((await sub()).tier).toBe("free");
    expect(await db.select().from(orgSubscriptions)).toHaveLength(1);
  });

  test("EXPIRATION sem validade informada também encerra agora", async () => {
    await applyRevenueCatEvent(db, ev("INITIAL_PURCHASE"), NOW);
    await applyRevenueCatEvent(db, ev("EXPIRATION", { expiration_at_ms: null }), NOW);
    expect((await sub()).tier).toBe("free");
  });

  test("cancelar ou expirar conta que nunca assinou: ignorado, nenhuma linha criada", async () => {
    expect(await applyRevenueCatEvent(db, ev("CANCELLATION"), NOW)).toBe("ignored");
    expect(await applyRevenueCatEvent(db, ev("EXPIRATION"), NOW)).toBe("ignored");
    expect(await db.select().from(orgSubscriptions)).toHaveLength(0);
  });
});

describe("applyRevenueCatEvent: idempotência, ordem e eventos que não interessam", () => {
  test("o MESMO evento duas vezes (reenvio) é aplicado uma vez só", async () => {
    const e = ev("INITIAL_PURCHASE");
    expect(await applyRevenueCatEvent(db, e, NOW)).toBe("applied");
    expect(await applyRevenueCatEvent(db, e, NOW)).toBe("ignored");
  });

  test("evento MAIS ANTIGO que o último aplicado não regride o plano", async () => {
    const velho = ev("INITIAL_PURCHASE", { expiration_at_ms: NOW.getTime() + 7 * DAY, event_timestamp_ms: NOW.getTime() });
    const novo = ev("RENEWAL", { expiration_at_ms: NOW.getTime() + 37 * DAY, event_timestamp_ms: NOW.getTime() + 60_000 });
    await applyRevenueCatEvent(db, novo, NOW);
    expect(await applyRevenueCatEvent(db, velho, NOW)).toBe("ignored");
    expect((await sub()).plusUntil).toBe(new Date(NOW.getTime() + 37 * DAY).toISOString());
  });

  test("app_user_id anônimo ($RCAnonymousID) ou de organização inexistente: ignorado", async () => {
    expect(await applyRevenueCatEvent(db, ev("INITIAL_PURCHASE", { app_user_id: "$RCAnonymousID:abc123" }), NOW)).toBe("ignored");
    expect(await applyRevenueCatEvent(db, ev("INITIAL_PURCHASE", { app_user_id: "org-que-nao-existe" }), NOW)).toBe("ignored");
    expect(await db.select().from(orgSubscriptions)).toHaveLength(0);
  });

  test("TEST, BILLING_ISSUE, TRANSFER e tipos desconhecidos: ignorados e não mexem no plano", async () => {
    await applyRevenueCatEvent(db, ev("INITIAL_PURCHASE"), NOW);
    const antes = await sub();
    for (const t of ["TEST", "BILLING_ISSUE", "TRANSFER", "SUBSCRIPTION_PAUSED", "ALGO_NOVO"]) {
      expect(await applyRevenueCatEvent(db, ev(t, { expiration_at_ms: NOW.getTime() - 1000 }), NOW)).toBe("ignored");
    }
    expect(await sub()).toEqual(antes);
  });

  test("evento que concede mas veio sem validade é ignorado (não concede Plus eterno)", async () => {
    expect(await applyRevenueCatEvent(db, ev("INITIAL_PURCHASE", { expiration_at_ms: null }), NOW)).toBe("ignored");
    expect((await sub()).tier).toBe("free");
  });

  test("evento sem app_user_id (TRANSFER) é ignorado", async () => {
    const e = { ...ev("TRANSFER") } as Partial<RevenueCatEvent>;
    delete e.app_user_id;
    expect(await applyRevenueCatEvent(db, e as RevenueCatEvent, NOW)).toBe("ignored");
  });

  test("não derruba Plus manual (fundador) com um evento antigo de outra origem: a ordem pelo instante vale", async () => {
    await grantPlus(db, "o1", new Date(NOW.getTime() + 365 * DAY), "manual", { eventMs: NOW.getTime() + 999_999 });
    expect(await applyRevenueCatEvent(db, ev("EXPIRATION", { expiration_at_ms: NOW.getTime() - 1000 }), NOW)).toBe("ignored");
    expect((await sub()).tier).toBe("plus");
  });
});

describe("Plus manual (testador/fundador) não é derrubado nem encurtado por evento da loja", () => {
  // o script grant-plus grava eventMs = 0 (como no uso real)
  const manual = (days: number) => grantPlus(db, "o1", new Date(NOW.getTime() + days * DAY), "manual");

  test("RENEWAL da loja com validade MENOR que a manual é ignorado: continua manual, na data manual", async () => {
    await manual(365);
    expect(await applyRevenueCatEvent(db, ev("RENEWAL", { expiration_at_ms: NOW.getTime() + 30 * DAY }), NOW)).toBe("ignored");
    expect(await sub()).toMatchObject({ tier: "plus", source: "manual", plusUntil: new Date(NOW.getTime() + 365 * DAY).toISOString() });
  });

  test("EXPIRATION e CANCELLATION da loja não derrubam o Plus manual (são da assinatura da loja, não da concessão)", async () => {
    await manual(365);
    expect(await applyRevenueCatEvent(db, ev("EXPIRATION", { expiration_at_ms: NOW.getTime() - 1000 }), NOW)).toBe("ignored");
    expect(await applyRevenueCatEvent(db, ev("CANCELLATION", { expiration_at_ms: NOW.getTime() - 1000 }), NOW)).toBe("ignored");
    expect((await sub()).tier).toBe("plus");
  });

  test("loja com validade MAIOR que a manual passa a valer (a pessoa pagou por mais tempo)", async () => {
    await manual(10);
    expect(await applyRevenueCatEvent(db, ev("INITIAL_PURCHASE", { expiration_at_ms: NOW.getTime() + 40 * DAY }), NOW)).toBe("applied");
    expect(await sub()).toMatchObject({ source: "apple", plusUntil: new Date(NOW.getTime() + 40 * DAY).toISOString() });
  });

  test("manual já vencido não protege nada: a loja volta a mandar", async () => {
    await grantPlus(db, "o1", new Date(NOW.getTime() - DAY), "manual");
    expect(await applyRevenueCatEvent(db, ev("INITIAL_PURCHASE", { expiration_at_ms: NOW.getTime() + 30 * DAY }), NOW)).toBe("applied");
    expect((await sub()).source).toBe("apple");
  });
});

