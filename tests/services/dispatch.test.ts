import { describe, test, expect } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { carePlans, pushSubscriptions, user, organization, member } from "@/lib/db/schema";
import { createPatient, archivePatient } from "@/lib/services/patients";
import { createItem } from "@/lib/services/items";
import { createPlan } from "@/lib/services/plans";
import { resolveSlot } from "@/lib/services/slots";
import { saveSubscription } from "@/lib/services/push";
import { dispatchDue, type PushSender } from "@/lib/services/dispatch";

const d = (s: string) => new Date(s);

async function setup() {
  const db = await createTestDb();
  await db.insert(user).values([
    { id: "u1", name: "Ana", email: "a@x.com" },
    { id: "u2", name: "Bia", email: "b@x.com" },
  ]);
  await db.insert(organization).values({ id: "o1", name: "A", slug: "a", createdAt: new Date() });
  await db.insert(member).values([
    { id: "m1", organizationId: "o1", userId: "u1", role: "owner", createdAt: new Date() },
    { id: "m2", organizationId: "o1", userId: "u2", role: "member", createdAt: new Date() },
  ]);
  await saveSubscription(db, "u1", { endpoint: "https://p/1", keys: { p256dh: "p", auth: "a" } });
  await saveSubscription(db, "u2", { endpoint: "https://p/2", keys: { p256dh: "p", auth: "a" } });
  const patient = await createPatient(db, "o1", { name: "Mimi" });
  const item = await createItem(db, "o1", { name: "Amoxicilina", kind: "medication", defaultDose: "1 comprimido" });
  const plan = await createPlan(db, "o1", {
    patientId: patient.id, itemId: item.id, intervalMinutes: 480,
    anchorAt: d("2026-11-04T08:00:00Z"), now: d("2026-11-04T07:00:00Z"),
  });
  const sent: { endpoint: string; title: string; body: string; tag: string }[] = [];
  const send: PushSender = async (sub, payload) => {
    sent.push({ endpoint: sub.endpoint, ...payload });
    return { ok: true };
  };
  return { db, patient, item, plan, sent, send };
}

describe("dispatchDue", () => {
  test("envia uma vez para cada membro e não repete no mesmo horário", async () => {
    const { db, sent, send, plan } = await setup();
    const now = d("2026-11-04T08:00:30Z");
    const r1 = await dispatchDue(db, now, send);
    expect(r1).toEqual({ plans: 1, sent: 2, removed: 0 });
    expect(sent.map((s) => s.endpoint).sort()).toEqual(["https://p/1", "https://p/2"]);
    expect(sent[0].body).toBe("Mimi — Amoxicilina (1 comprimido)");
    expect(sent[0].tag).toBe(`${plan.id}-${plan.nextDueAt.getTime()}`);
    const r2 = await dispatchDue(db, now, send);
    expect(r2.sent).toBe(0);
  });

  test("antes do horário não envia; após registrar a dose, envia o próximo slot", async () => {
    const { db, sent, send, plan } = await setup();
    expect((await dispatchDue(db, d("2026-11-04T07:59:00Z"), send)).sent).toBe(0);
    await dispatchDue(db, d("2026-11-04T08:00:30Z"), send);
    await resolveSlot(db, "o1", "u1", {
      planId: plan.id, scheduledFor: plan.nextDueAt, outcome: "done", now: d("2026-11-04T08:05:00Z"),
    });
    sent.length = 0;
    expect((await dispatchDue(db, d("2026-11-04T16:00:30Z"), send)).sent).toBe(2);
  });

  test("inscrição expirada (gone) é removida e as demais continuam", async () => {
    const { db } = await setup();
    const delivered: string[] = [];
    const send: PushSender = async (sub) => {
      if (sub.endpoint === "https://p/1") return { ok: false, gone: true };
      delivered.push(sub.endpoint);
      return { ok: true };
    };
    const r = await dispatchDue(db, d("2026-11-04T08:00:30Z"), send);
    expect(r).toEqual({ plans: 1, sent: 1, removed: 1 });
    expect(delivered).toEqual(["https://p/2"]);
    expect((await db.select().from(pushSubscriptions)).map((s) => s.endpoint)).toEqual(["https://p/2"]);
  });

  test("falha não-fatal de um envio não interrompe os demais", async () => {
    const { db } = await setup();
    const delivered: string[] = [];
    const send: PushSender = async (sub) => {
      if (sub.endpoint === "https://p/1") throw new Error("rede");
      delivered.push(sub.endpoint);
      return { ok: true };
    };
    const r = await dispatchDue(db, d("2026-11-04T08:00:30Z"), send);
    expect(delivered).toEqual(["https://p/2"]);
    expect(r.sent).toBe(1);
  });

  test("plano inativo, paciente arquivado ou endAt vencido não notificam", async () => {
    const a = await setup();
    await a.db.update(carePlans).set({ active: false });
    expect((await dispatchDue(a.db, d("2026-11-04T09:00:00Z"), a.send)).sent).toBe(0);

    const b = await setup();
    await archivePatient(b.db, "o1", b.patient.id);
    expect((await dispatchDue(b.db, d("2026-11-04T09:00:00Z"), b.send)).sent).toBe(0);

    const c = await setup();
    await c.db.update(carePlans).set({ endAt: d("2026-11-04T07:30:00Z") });
    expect((await dispatchDue(c.db, d("2026-11-04T09:00:00Z"), c.send)).sent).toBe(0);
  });

  test("execuções concorrentes enviam cada inscrição uma única vez", async () => {
    const { db, sent, send } = await setup();
    const now = d("2026-11-04T08:00:30Z");
    await Promise.all([dispatchDue(db, now, send), dispatchDue(db, now, send)]);
    expect(sent).toHaveLength(2);
  });
});

describe("lembretes repetidos e falhas", () => {
  test("dose não registrada é lembrada de novo a cada intervalo, uma vez por slot", async () => {
    const { db, sent, send } = await setup();
    await dispatchDue(db, d("2026-11-04T08:00:30Z"), send);
    expect(sent).toHaveLength(2);
    expect((await dispatchDue(db, d("2026-11-04T12:00:00Z"), send)).sent).toBe(0);
    expect((await dispatchDue(db, d("2026-11-04T16:00:30Z"), send)).sent).toBe(2);
    expect((await dispatchDue(db, d("2026-11-04T16:05:00Z"), send)).sent).toBe(0);
    expect(new Set(sent.map((s) => s.tag)).size).toBe(2);
  });

  test("se todos os envios falharem, o lembrete é tentado de novo na rodada seguinte", async () => {
    const { db, sent, send } = await setup();
    const boom: PushSender = async () => { throw new Error("503"); };
    const now = d("2026-11-04T08:00:30Z");
    expect((await dispatchDue(db, now, boom)).sent).toBe(0);
    expect((await dispatchDue(db, now, send)).sent).toBe(2);
    expect(sent).toHaveLength(2);
  });

  test("depois do endAt não há novos lembretes", async () => {
    const { db, send } = await setup();
    await db.update(carePlans).set({ endAt: d("2026-11-04T09:00:00Z") });
    await dispatchDue(db, d("2026-11-04T08:00:30Z"), send);
    expect((await dispatchDue(db, d("2026-11-04T16:00:30Z"), send)).sent).toBe(0);
  });
});


describe("lembretes sobre slots", () => {
  test("dose já resolvida antes do cron rodar não notifica", async () => {
    const { db, sent, send, plan } = await setup();
    await resolveSlot(db, "o1", "u1", { planId: plan.id, scheduledFor: d("2026-11-04T08:00:00Z"), outcome: "done", now: d("2026-11-04T07:50:00Z") });
    expect((await dispatchDue(db, d("2026-11-04T08:00:30Z"), send)).sent).toBe(0);
    expect(sent).toHaveLength(0);
  });

  test("cron parado com 3 slots pendentes envia 1 notificação (a mais recente) e não reenvia as antigas", async () => {
    const { db, sent, send, plan } = await setup();
    const r = await dispatchDue(db, d("2026-11-05T00:30:00Z"), send); // 08:00, 16:00 e 00:00 pendentes
    expect(r.plans).toBe(1);
    expect(sent).toHaveLength(2);
    expect(new Set(sent.map((x) => x.tag))).toEqual(new Set([`${plan.id}-${d("2026-11-05T00:00:00Z").getTime()}`]));
    expect((await dispatchDue(db, d("2026-11-05T00:40:00Z"), send)).sent).toBe(0);
  });

  test("horário já avisado pela versão anterior (notified_for_due_at) não é reenviado", async () => {
    const { db, send, sent } = await setup();
    await db.update(carePlans).set({ notifiedForDueAt: d("2026-11-04T08:00:00Z") });
    expect((await dispatchDue(db, d("2026-11-04T08:00:30Z"), send)).sent).toBe(0);
    expect(sent).toHaveLength(0);
    expect((await dispatchDue(db, d("2026-11-04T16:00:30Z"), send)).sent).toBe(2);
  });
});

describe("vários aparelhos do mesmo usuário", () => {
  test("cada aparelho recebe o lembrete (3 aparelhos de u1 + 1 de u2 = 4 envios)", async () => {
    const { db, sent, send } = await setup();
    await saveSubscription(db, "u1", { endpoint: "https://p/1-tablet", keys: { p256dh: "p", auth: "a" } });
    await saveSubscription(db, "u1", { endpoint: "https://p/1-notebook", keys: { p256dh: "p", auth: "a" } });
    const r = await dispatchDue(db, d("2026-11-04T08:00:30Z"), send);
    expect(r.sent).toBe(4);
    expect(sent.map((s) => s.endpoint).sort()).toEqual(
      ["https://p/1", "https://p/1-notebook", "https://p/1-tablet", "https://p/2"],
    );
  });

  test("um aparelho expirado (410) é removido e os outros do mesmo usuário continuam recebendo", async () => {
    const { db } = await setup();
    await saveSubscription(db, "u1", { endpoint: "https://p/1-tablet", keys: { p256dh: "p", auth: "a" } });
    const delivered: string[] = [];
    const send: PushSender = async (sub) => {
      if (sub.endpoint === "https://p/1") return { ok: false, gone: true };
      delivered.push(sub.endpoint);
      return { ok: true };
    };
    const r = await dispatchDue(db, d("2026-11-04T08:00:30Z"), send);
    expect(r).toEqual({ plans: 1, sent: 2, removed: 1 });
    expect(delivered.sort()).toEqual(["https://p/1-tablet", "https://p/2"]);
    const left = (await db.select().from(pushSubscriptions)).map((s) => s.endpoint).sort();
    expect(left).toEqual(["https://p/1-tablet", "https://p/2"]);
  });
});
