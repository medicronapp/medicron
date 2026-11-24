import { describe, test, expect } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-db";
import { carePlans, careSlots, user, organization, member, pushSubscriptions } from "@/lib/db/schema";
import { archivePatient, createPatient, getPatient, listPatients, pausePatient, resumePatient } from "@/lib/services/patients";
import { createItem } from "@/lib/services/items";
import { createPlan, listPlansForPatient } from "@/lib/services/plans";
import { ensureSlots, resolveSlot } from "@/lib/services/slots";
import { dispatchDue, type PushSender } from "@/lib/services/dispatch";
import { getHome } from "@/lib/services/home";
import { getSubscription } from "@/lib/services/subscription";
import { dispatchIfDue, memoryHintStore, nextWakeAt, setHintStore } from "@/lib/services/wake-hint";

const d = (s: string) => new Date(s);
const noSend: PushSender = async () => ({ ok: true });

async function setup() {
  const db = await createTestDb();
  await db.insert(user).values({ id: "u1", name: "Ana", email: "a@x.com" });
  await db.insert(organization).values({ id: "o1", name: "A", slug: "a", createdAt: new Date() });
  await db.insert(member).values({ id: "m1", organizationId: "o1", userId: "u1", role: "owner", createdAt: new Date() });
  await db.insert(pushSubscriptions).values({ userId: "u1", endpoint: "https://p/1", p256dh: "p", auth: "a" }).catch(() => undefined);
  const patient = await createPatient(db, "o1", { name: "Mel", species: "cat" });
  const item = await createItem(db, "o1", { name: "Amoxicilina", kind: "medication", defaultDose: "1" });
  const plan = await createPlan(db, "o1", {
    patientId: patient.id, itemId: item.id, intervalMinutes: 480,
    anchorAt: d("2026-11-04T08:00:00Z"), now: d("2026-11-04T07:00:00Z"),
  });
  const slots = async () => (await db.select().from(careSlots).where(eq(careSlots.carePlanId, plan.id))).map((s) => s.scheduledFor.toISOString()).sort();
  return { db, patient, item, plan, slots };
}

describe("pausePatient", () => {
  test("marca a pausa, mantém o paciente na lista e a prescrição ativa", async () => {
    const { db, patient, plan } = await setup();
    const now = d("2026-11-04T12:00:00Z");
    const paused = await pausePatient(db, "o1", patient.id, now);
    expect(paused?.pausedAt).toEqual(now);
    expect((await listPatients(db, "o1")).map((p) => p.id)).toEqual([patient.id]);
    expect((await getPatient(db, "o1", patient.id))?.pausedAt).toEqual(now);
    const plans = await listPlansForPatient(db, "o1", patient.id);
    expect(plans.map((p) => [p.id, p.active])).toEqual([[plan.id, true]]);
  });

  test("é idempotente: pausar de novo não troca a data da pausa", async () => {
    const { db, patient } = await setup();
    await pausePatient(db, "o1", patient.id, d("2026-11-04T12:00:00Z"));
    const again = await pausePatient(db, "o1", patient.id, d("2026-11-05T12:00:00Z"));
    expect(again?.pausedAt).toEqual(d("2026-11-04T12:00:00Z"));
  });

  test("paciente inexistente, de outra conta ou arquivado: null", async () => {
    const { db, patient } = await setup();
    expect(await pausePatient(db, "o1", "nao-existe")).toBeNull();
    expect(await pausePatient(db, "o2", patient.id)).toBeNull();
    await archivePatient(db, "o1", patient.id);
    expect(await pausePatient(db, "o1", patient.id)).toBeNull();
  });

  test("apaga as doses futuras ainda sem resultado; guarda as já resolvidas e as passadas", async () => {
    const { db, patient, plan, slots } = await setup();
    await ensureSlots(db, d("2026-11-04T20:00:00Z"));
    expect(await slots()).toEqual(["2026-11-04T08:00:00.000Z", "2026-11-04T16:00:00.000Z", "2026-11-05T00:00:00.000Z"]);
    await resolveSlot(db, "o1", "u1", { planId: plan.id, scheduledFor: d("2026-11-04T08:00:00Z"), outcome: "done", now: d("2026-11-04T08:05:00Z") });
    await pausePatient(db, "o1", patient.id, d("2026-11-04T12:00:00Z"));
    expect(await slots()).toEqual(["2026-11-04T08:00:00.000Z"]);
  });

  test("pausado não gera doses, não aparece na Hoje, não é avisado e não acorda o cron", async () => {
    const { db, patient, slots } = await setup();
    await pausePatient(db, "o1", patient.id, d("2026-11-04T07:30:00Z"));
    const now = d("2026-11-04T16:30:00Z");
    expect(await ensureSlots(db, now)).toBe(0);
    expect(await slots()).toEqual([]);
    const home = await getHome(db, "o1", now);
    expect(home.patients).toEqual([]);
    expect(await dispatchDue(db, now, noSend)).toEqual({ plans: 0, sent: 0, removed: 0 });
    expect(await nextWakeAt(db, now)).toBeNull();
  });

  test("não conta no limite de pacientes da conta", async () => {
    const { db, patient } = await setup();
    expect((await getSubscription(db, "o1", d("2026-11-04T12:00:00Z"))).usage.patients).toBe(1);
    await pausePatient(db, "o1", patient.id, d("2026-11-04T12:00:00Z"));
    expect((await getSubscription(db, "o1", d("2026-11-04T12:00:00Z"))).usage.patients).toBe(0);
  });
});

describe("resumePatient", () => {
  test("tira a pausa e a prescrição continua, a partir da próxima dose (sem cobrar o que passou na pausa)", async () => {
    const { db, patient, plan, slots } = await setup();
    await ensureSlots(db, d("2026-11-04T20:00:00Z"));
    await pausePatient(db, "o1", patient.id, d("2026-11-04T12:00:00Z"));
    const resumeAt = d("2026-11-06T10:00:00Z");
    const resumed = await resumePatient(db, "o1", patient.id, resumeAt);
    expect(resumed?.pausedAt).toBeNull();
    const [p] = await db.select().from(carePlans).where(eq(carePlans.id, plan.id));
    expect(p.startsAt).toEqual(d("2026-11-06T16:00:00Z")); // próximo horário da grade de 8 em 8 h
    expect(p.nextDueAt).toEqual(d("2026-11-06T16:00:00Z"));
    await ensureSlots(db, resumeAt);
    // nada dos dias da pausa; só a partir da próxima dose (até o fim do dia, em Brasília)
    expect(await slots()).toEqual(["2026-11-04T08:00:00.000Z", "2026-11-06T16:00:00.000Z", "2026-11-07T00:00:00.000Z"]);
  });

  test("depois de retomar, o paciente volta à Hoje, aos avisos e ao cron", async () => {
    const { db, patient } = await setup();
    await pausePatient(db, "o1", patient.id, d("2026-11-04T07:30:00Z"));
    await resumePatient(db, "o1", patient.id, d("2026-11-04T09:00:00Z"));
    expect(await nextWakeAt(db, d("2026-11-04T09:00:00Z"))).toEqual(d("2026-11-04T16:00:00Z"));
    const now = d("2026-11-04T16:00:30Z");
    expect((await getHome(db, "o1", now)).patients.map((x) => x.patientName)).toEqual(["Mel"]);
  });

  test("retomar quem não está pausado não mexe em nada; inexistente ou de outra conta: null", async () => {
    const { db, patient, plan } = await setup();
    const before = (await db.select().from(carePlans).where(eq(carePlans.id, plan.id)))[0];
    const r = await resumePatient(db, "o1", patient.id, d("2026-11-10T10:00:00Z"));
    expect(r?.pausedAt).toBeNull();
    const after = (await db.select().from(carePlans).where(eq(carePlans.id, plan.id)))[0];
    expect(after.startsAt).toEqual(before.startsAt);
    expect(await resumePatient(db, "o1", "nao-existe")).toBeNull();
    expect(await resumePatient(db, "o2", patient.id)).toBeNull();
  });

  test("rotina com data final já passada continua encerrada ao retomar", async () => {
    const { db, patient, item } = await setup();
    const ended = await createPlan(db, "o1", {
      patientId: patient.id, itemId: item.id, intervalMinutes: 60, anchorAt: d("2026-11-04T08:00:00Z"),
      endAt: d("2026-11-04T10:00:00Z"), now: d("2026-11-04T07:00:00Z"),
    });
    await pausePatient(db, "o1", patient.id, d("2026-11-04T09:00:00Z"));
    await resumePatient(db, "o1", patient.id, d("2026-11-10T10:00:00Z"));
    await ensureSlots(db, d("2026-11-10T10:00:00Z"));
    const rows = await db.select().from(careSlots).where(eq(careSlots.carePlanId, ended.id));
    expect(rows.every((s) => s.scheduledFor.getTime() <= d("2026-11-04T10:00:00Z").getTime())).toBe(true);
  });
});

describe("pausar e retomar avisam o cache do cron", () => {
  test("a dica de próxima dose é refeita depois de pausar e de retomar", async () => {
    const { db, patient } = await setup();
    setHintStore(memoryHintStore());
    await dispatchIfDue(db, d("2026-11-04T07:00:10Z"), noSend);
    expect((await dispatchIfDue(db, d("2026-11-04T07:00:20Z"), noSend)).skipped).toBe(true);
    await pausePatient(db, "o1", patient.id, d("2026-11-04T07:00:30Z"));
    expect((await dispatchIfDue(db, d("2026-11-04T07:00:40Z"), noSend)).skipped).toBe(false);
    expect((await dispatchIfDue(db, d("2026-11-04T07:00:50Z"), noSend)).skipped).toBe(true);
    await resumePatient(db, "o1", patient.id, d("2026-11-04T07:01:00Z"));
    expect((await dispatchIfDue(db, d("2026-11-04T07:01:10Z"), noSend)).skipped).toBe(false);
  });
});
