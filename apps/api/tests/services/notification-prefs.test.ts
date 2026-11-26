import { describe, test, expect } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { member, organization, patientNotificationMutes, user } from "@/lib/db/schema";
import { archivePatient, createPatient } from "@/lib/services/patients";
import { createItem } from "@/lib/services/items";
import { createPlan } from "@/lib/services/plans";
import { saveDevice, saveSubscription } from "@/lib/services/push";
import { dispatchDue, type DeviceSender, type PushSender } from "@/lib/services/dispatch";
import { purgeUserData } from "@/lib/services/account-deletion";
import { mutedPatientIds, setPatientNotifications } from "@/lib/services/notification-prefs";

const d = (s: string) => new Date(s);

async function setup() {
  const db = await createTestDb();
  await db.insert(user).values([
    { id: "u1", name: "Ana", email: "a@x.com" },
    { id: "u2", name: "Bia", email: "b@x.com" },
  ]);
  await db.insert(organization).values([
    { id: "o1", name: "Casa", slug: "a", createdAt: new Date() },
    { id: "o2", name: "Outra", slug: "b", createdAt: new Date() },
  ]);
  await db.insert(member).values([
    { id: "m1", organizationId: "o1", userId: "u1", role: "owner", createdAt: new Date() },
    { id: "m2", organizationId: "o1", userId: "u2", role: "member", createdAt: new Date() },
  ]);
  const mel = await createPatient(db, "o1", { name: "Mel", species: "cat" });
  const pedro = await createPatient(db, "o1", { name: "Pedro", species: "human" });
  const item = await createItem(db, "o1", { name: "Remédio", kind: "medication", defaultDose: "1" });
  for (const p of [mel, pedro]) {
    await createPlan(db, "o1", { patientId: p.id, itemId: item.id, intervalMinutes: 480, anchorAt: d("2026-11-04T08:00:00Z"), now: d("2026-11-04T07:00:00Z") });
  }
  await saveSubscription(db, "u1", { endpoint: "https://p/u1", keys: { p256dh: "p", auth: "a" } });
  await saveSubscription(db, "u2", { endpoint: "https://p/u2", keys: { p256dh: "p", auth: "a" } });
  await saveDevice(db, "u1", { token: "ExponentPushToken[u1]", platform: "ios" });
  await saveDevice(db, "u2", { token: "ExponentPushToken[u2]", platform: "ios" });
  return { db, mel, pedro };
}

function senders() {
  const web: { endpoint: string; body: string }[] = [];
  const native: { token: string; body: string }[] = [];
  const send: PushSender = async (sub, payload) => { web.push({ endpoint: sub.endpoint, body: payload.body }); return { ok: true }; };
  const sendDevices: DeviceSender = async (devices, payload) => {
    for (const dv of devices) native.push({ token: dv.token, body: payload.body });
    return { sent: devices.length, gone: [] };
  };
  return { web, native, send, sendDevices };
}

describe("setPatientNotifications / mutedPatientIds", () => {
  test("por padrão ninguém silenciou nada; desligar e ligar de novo, idempotente", async () => {
    const { db, mel } = await setup();
    expect((await mutedPatientIds(db, "u1")).size).toBe(0);
    expect(await setPatientNotifications(db, "o1", "u1", mel.id, false)).toBe(true);
    expect(await setPatientNotifications(db, "o1", "u1", mel.id, false)).toBe(true);
    expect([...(await mutedPatientIds(db, "u1"))]).toEqual([mel.id]);
    expect(await setPatientNotifications(db, "o1", "u1", mel.id, true)).toBe(true);
    expect(await setPatientNotifications(db, "o1", "u1", mel.id, true)).toBe(true);
    expect((await mutedPatientIds(db, "u1")).size).toBe(0);
  });

  test("é pessoal: silenciar para uma pessoa não muda a outra", async () => {
    const { db, mel } = await setup();
    await setPatientNotifications(db, "o1", "u1", mel.id, false);
    expect((await mutedPatientIds(db, "u2")).size).toBe(0);
  });

  test("paciente de outra conta, inexistente ou arquivado: false e nada gravado", async () => {
    const { db, mel } = await setup();
    expect(await setPatientNotifications(db, "o2", "u1", mel.id, false)).toBe(false);
    expect(await setPatientNotifications(db, "o1", "u1", "nao-existe", false)).toBe(false);
    await archivePatient(db, "o1", mel.id);
    expect(await setPatientNotifications(db, "o1", "u1", mel.id, false)).toBe(false);
    expect((await db.select().from(patientNotificationMutes)).length).toBe(0);
  });
});

describe("dispatchDue respeita os avisos por paciente", () => {
  const now = d("2026-11-04T08:00:30Z");

  test("sem nenhum silenciamento: todos recebem os dois pacientes (como sempre)", async () => {
    const { db } = await setup();
    const s = senders();
    await dispatchDue(db, now, s.send, s.sendDevices);
    expect(s.web.filter((x) => x.endpoint === "https://p/u2")).toHaveLength(2);
    expect(s.native.filter((x) => x.token === "ExponentPushToken[u2]")).toHaveLength(2);
  });

  test("quem silenciou o paciente não recebe o aviso dele (web e aparelho), mas recebe o do outro; os demais recebem tudo", async () => {
    const { db, mel } = await setup();
    await setPatientNotifications(db, "o1", "u2", mel.id, false);
    const s = senders();
    const r = await dispatchDue(db, now, s.send, s.sendDevices);
    expect(r.plans).toBe(2);
    const u2web = s.web.filter((x) => x.endpoint === "https://p/u2").map((x) => x.body);
    expect(u2web).toHaveLength(1);
    expect(u2web[0]).toContain("Pedro");
    const u2dev = s.native.filter((x) => x.token === "ExponentPushToken[u2]").map((x) => x.body);
    expect(u2dev).toHaveLength(1);
    expect(u2dev[0]).toContain("Pedro");
    expect(s.web.filter((x) => x.endpoint === "https://p/u1")).toHaveLength(2);
    expect(s.native.filter((x) => x.token === "ExponentPushToken[u1]")).toHaveLength(2);
  });

  test("todo mundo silenciou o paciente: ninguém é avisado e o horário não fica para nova tentativa", async () => {
    const { db, mel, pedro } = await setup();
    await setPatientNotifications(db, "o1", "u1", mel.id, false);
    await setPatientNotifications(db, "o1", "u2", mel.id, false);
    const s = senders();
    await dispatchDue(db, now, s.send, s.sendDevices);
    expect(s.web.every((x) => x.body.includes("Pedro"))).toBe(true);
    const again = senders();
    await dispatchDue(db, now, again.send, again.sendDevices);
    expect(again.web).toHaveLength(0);
    expect(pedro.id).toBeTruthy();
  });

  test("ligar de novo volta a avisar nos próximos horários", async () => {
    const { db, mel } = await setup();
    await setPatientNotifications(db, "o1", "u2", mel.id, false);
    await setPatientNotifications(db, "o1", "u2", mel.id, true);
    const s = senders();
    await dispatchDue(db, now, s.send, s.sendDevices);
    expect(s.web.filter((x) => x.endpoint === "https://p/u2")).toHaveLength(2);
  });
});

describe("limpeza", () => {
  test("excluir a conta da única pessoa leva junto os silenciamentos (sem erro de vínculo)", async () => {
    const db = await createTestDb();
    await db.insert(user).values({ id: "u1", name: "Ana", email: "a@x.com" });
    await db.insert(organization).values({ id: "o1", name: "Casa", slug: "a", createdAt: new Date() });
    await db.insert(member).values({ id: "m1", organizationId: "o1", userId: "u1", role: "owner", createdAt: new Date() });
    const p = await createPatient(db, "o1", { name: "Mel", species: "cat" });
    await setPatientNotifications(db, "o1", "u1", p.id, false);
    await purgeUserData(db, "u1");
    expect((await db.select().from(patientNotificationMutes)).length).toBe(0);
  });
});
