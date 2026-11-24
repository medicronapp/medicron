import { describe, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-db";
import { member, organization, user } from "@/lib/db/schema";
import { createPatient } from "@/lib/services/patients";
import { createItem } from "@/lib/services/items";
import { createPlan } from "@/lib/services/plans";
import { saveSubscription, saveDevice } from "@/lib/services/push";
import { dismissChecklist, getOnboarding, markWelcomeOfferSeen, markWelcomeSeen } from "@/lib/services/onboarding";
import { grantPlus } from "@/lib/services/subscription";

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

describe("oferta de boas-vindas (aparece uma vez)", () => {
  async function withOrg() {
    const db = await setup();
    await db.insert(organization).values({ id: "o1", name: "Casa", slug: "casa", createdAt: new Date() });
    await db.insert(member).values([
      { id: "m1", organizationId: "o1", userId: "u1", role: "owner", createdAt: new Date() },
      { id: "m2", organizationId: "o1", userId: "u2", role: "member", createdAt: new Date() },
    ]);
    return db;
  }

  test("dono (ou admin) de conta grátis que nunca viu a oferta: elegível", async () => {
    const db = await withOrg();
    expect((await getOnboarding(db, "u1", "o1")).welcomeOffer).toBe(true);
  });

  test("quem é só membro (não pode assinar) não vê a oferta", async () => {
    const db = await withOrg();
    expect((await getOnboarding(db, "u2", "o1")).welcomeOffer).toBe(false);
  });

  test("conta que já é Plus não vê a oferta", async () => {
    const db = await withOrg();
    await grantPlus(db, "o1", new Date(Date.now() + 86_400_000 * 30), "manual");
    expect((await getOnboarding(db, "u1", "o1")).welcomeOffer).toBe(false);
  });

  test("depois de exibida nunca mais: marcar é idempotente e vale só para aquele usuário", async () => {
    const db = await withOrg();
    await db.update(member).set({ role: "admin" }).where(eq(member.id, "m2"));
    await markWelcomeOfferSeen(db, "u1");
    await markWelcomeOfferSeen(db, "u1");
    expect((await getOnboarding(db, "u1", "o1")).welcomeOffer).toBe(false);
    expect((await getOnboarding(db, "u2", "o1")).welcomeOffer).toBe(true);
  });

  test("marcar a oferta não mexe nas boas-vindas nem no checklist", async () => {
    const db = await withOrg();
    await markWelcomeOfferSeen(db, "u1");
    const o = await getOnboarding(db, "u1", "o1");
    expect(o.showWelcome).toBe(true);
    expect(o.checklist.show).toBe(true);
  });

  test("conta que não existe para o usuário (sem vínculo): sem oferta", async () => {
    const db = await withOrg();
    expect((await getOnboarding(db, "u1", "outra-org")).welcomeOffer).toBe(false);
  });
});


describe("migração 0011: quem já existia não vê a oferta", () => {
  test("o preenchimento marca os usuários existentes (com ou sem linha de onboarding) e não mexe no resto", async () => {
    const { readFileSync } = await import("node:fs");
    const { sql } = await import("drizzle-orm");
    const { userOnboarding } = await import("@/lib/db/schema");
    const db = await withOrgDb();
    await markWelcomeSeen(db, "u2"); // u2 já tem linha (boas-vindas vistas); u1 não tem
    await db.update(userOnboarding).set({ welcomeOfferSeenAt: null });
    const file = readFileSync("drizzle/0011_welcome_offer_seen.sql", "utf8");
    const backfill = file.split("--> statement-breakpoint")[1];
    await db.execute(sql.raw(backfill));
    expect((await getOnboarding(db, "u1", "o1")).welcomeOffer).toBe(false);
    expect((await getOnboarding(db, "u2", "o1")).welcomeOffer).toBe(false);
    expect((await getOnboarding(db, "u2", "o1")).showWelcome).toBe(false); // intacto
    await db.insert(user).values({ id: "u3", name: "Cris", email: "c@x.com" });
    await db.insert(member).values({ id: "m3", organizationId: "o1", userId: "u3", role: "owner", createdAt: new Date() });
    expect((await getOnboarding(db, "u3", "o1")).welcomeOffer).toBe(true); // conta nova depois da migração vê
  });
});

async function withOrgDb() {
  const db = await setup();
  await db.insert(organization).values({ id: "o1", name: "Casa", slug: "casa", createdAt: new Date() });
  await db.insert(member).values([
    { id: "m1", organizationId: "o1", userId: "u1", role: "owner", createdAt: new Date() },
    { id: "m2", organizationId: "o1", userId: "u2", role: "owner", createdAt: new Date() },
  ]);
  return db;
}
