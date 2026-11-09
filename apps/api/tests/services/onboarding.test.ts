import { describe, expect, test } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { user } from "@/lib/db/schema";
import { createPatient } from "@/lib/services/patients";
import { createItem } from "@/lib/services/items";
import { createPlan } from "@/lib/services/plans";
import { saveSubscription, saveDevice } from "@/lib/services/push";
import { dismissChecklist, getOnboarding, markWelcomeSeen } from "@/lib/services/onboarding";

async function setup() {
  const db = await createTestDb();
  await db.insert(user).values([{ id: "u1", name: "Ana", email: "a@x.com" }, { id: "u2", name: "Bia", email: "b@x.com" }]);
  return db;
}

describe("onboarding", () => {
  test("quem nunca viu: boas-vindas e checklist aparecem, com os 4 passos pendentes", async () => {
    const db = await setup();
    const o = await getOnboarding(db, "u1", "o1");
    expect(o.showWelcome).toBe(true);
    expect(o.checklist).toEqual({ show: true, steps: { patient: false, item: false, plan: false, push: false } });
  });

  test("concluir as boas-vindas não mostra de novo e é idempotente", async () => {
    const db = await setup();
    await markWelcomeSeen(db, "u1");
    const first = (await getOnboarding(db, "u1", "o1")).showWelcome;
    await markWelcomeSeen(db, "u1");
    expect(first).toBe(false);
    expect((await getOnboarding(db, "u1", "o1")).showWelcome).toBe(false);
    expect((await getOnboarding(db, "u2", "o1")).showWelcome).toBe(true);
  });

  test("dispensar o checklist esconde só o checklist, para aquele usuário", async () => {
    const db = await setup();
    await dismissChecklist(db, "u1");
    await dismissChecklist(db, "u1");
    const o = await getOnboarding(db, "u1", "o1");
    expect(o.checklist.show).toBe(false);
    expect(o.showWelcome).toBe(true);
    expect((await getOnboarding(db, "u2", "o1")).checklist.show).toBe(true);
  });

  test("os passos se marcam pelo uso real: paciente, item, rotina e avisos", async () => {
    const db = await setup();
    const patient = await createPatient(db, "o1", { name: "Izzy", species: "cat" });
    expect((await getOnboarding(db, "u1", "o1")).checklist.steps).toEqual({ patient: true, item: false, plan: false, push: false });
    const item = await createItem(db, "o1", { name: "Agemoxi", kind: "medication" });
    expect((await getOnboarding(db, "u1", "o1")).checklist.steps).toEqual({ patient: true, item: true, plan: false, push: false });
    await createPlan(db, "o1", { patientId: patient.id, itemId: item.id, intervalMinutes: 480, anchorAt: new Date("2026-11-06T12:00:00Z"), now: new Date("2026-11-06T11:00:00Z") });
    await saveSubscription(db, "u1", { endpoint: "https://p/1", keys: { p256dh: "k", auth: "a" } });
    expect((await getOnboarding(db, "u1", "o1")).checklist.steps).toEqual({ patient: true, item: true, plan: true, push: true });
    // avisos são por usuário; os demais passos são da conta
    expect((await getOnboarding(db, "u2", "o1")).checklist.steps).toEqual({ patient: true, item: true, plan: true, push: false });
  });

  test("passos de outra conta não contam", async () => {
    const db = await setup();
    await createPatient(db, "o2", { name: "Outro", species: "dog" });
    expect((await getOnboarding(db, "u1", "o1")).checklist.steps.patient).toBe(false);
  });
});

describe("passo 'push' do checklist com aparelho nativo", () => {
  test("só um aparelho nativo já marca o passo", async () => {
    const db = await createTestDb();
    await db.insert(user).values({ id: "u1", name: "Ana", email: "a@x.com" });
    expect((await getOnboarding(db, "u1", "o1")).checklist.steps.push).toBe(false);
    await saveDevice(db, "u1", { token: "ExponentPushToken[a]", platform: "ios" });
    expect((await getOnboarding(db, "u1", "o1")).checklist.steps.push).toBe(true);
  });
});
