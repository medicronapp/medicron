import { describe, expect, test } from "vitest";
import { eq, sql } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-db";
import {
  carePlans, careSlots, doseLogs, invitation, items, member, organization, orgSubscriptions, patients, pushDevices, pushSubscriptions, user,
} from "@/lib/db/schema";
import { createPatient } from "@/lib/services/patients";
import { createItem } from "@/lib/services/items";
import { createPlan } from "@/lib/services/plans";
import { resolveSlot, ensureSlots } from "@/lib/services/slots";
import { saveDevice, saveSubscription } from "@/lib/services/push";
import { purgeUserData } from "@/lib/services/account-deletion";
import { grantPlus } from "@/lib/services/subscription";

const d = (s: string) => new Date(s);

async function base() {
  const db = await createTestDb();
  await db.insert(user).values([
    { id: "u1", name: "Ana", email: "a@x.com" },
    { id: "u2", name: "Bia", email: "b@x.com" },
    { id: "u3", name: "Caio", email: "c@x.com" },
  ]);
  await db.insert(organization).values([
    { id: "o1", name: "Casa de Ana", slug: "a", createdAt: new Date() },
    { id: "o2", name: "Casa compartilhada", slug: "c", createdAt: new Date() },
    { id: "o3", name: "Casa de Caio", slug: "k", createdAt: new Date() },
  ]);
  return db;
}

/** Dados completos de uma organização: paciente, item, rotina, horários e uma dose registrada. */
async function fill(db: Awaited<ReturnType<typeof base>>, org: string, userId: string) {
  const patient = await createPatient(db, org, { name: `Paciente ${org}`, species: "cat" });
  const item = await createItem(db, org, { name: `Item ${org}`, kind: "medication" });
  const plan = await createPlan(db, org, {
    patientId: patient.id, itemId: item.id, intervalMinutes: 480,
    anchorAt: d("2026-11-04T08:00:00Z"), now: d("2026-11-04T07:00:00Z"),
  });
  await ensureSlots(db, d("2026-11-04T09:00:00Z"));
  await resolveSlot(db, org, userId, { planId: plan.id, scheduledFor: plan.nextDueAt, outcome: "done", now: d("2026-11-04T08:05:00Z") });
  // Registro antigo de dose (a tabela ainda existe e também precisa sumir com a organização).
  await db.insert(doseLogs).values({ organizationId: org, carePlanId: plan.id, scheduledFor: plan.nextDueAt, outcome: "done", doneByUserId: userId });
  return { patient, item, plan };
}

type TestDb = Awaited<ReturnType<typeof base>>;
type Counted = typeof patients | typeof items | typeof carePlans | typeof careSlots | typeof doseLogs;
/** Quantas linhas a tabela tem (da organização `org`, ou no total). */
const count = async (db: TestDb, table: Counted, org?: string) => {
  const rows = (await db.select().from(table)) as { organizationId: string }[];
  return org ? rows.filter((r) => r.organizationId === org).length : rows.length;
};

describe("purgeUserData", () => {
  test("conta só do usuário: apaga a organização e TUDO o que é dela, sem tocar nas outras", async () => {
    const db = await base();
    await db.insert(member).values([
      { id: "m1", organizationId: "o1", userId: "u1", role: "owner", createdAt: new Date() },
      { id: "m3", organizationId: "o3", userId: "u3", role: "owner", createdAt: new Date() },
    ]);
    await db.insert(invitation).values({ id: "i1", organizationId: "o1", email: "x@x.com", status: "pending", expiresAt: new Date(Date.now() + 1e9), inviterId: "u1" });
    await fill(db, "o1", "u1");
    await fill(db, "o3", "u3");

    const r = await purgeUserData(db, "u1");
    expect(r).toEqual({ deletedOrganizations: ["o1"], leftOrganizations: [] });

    for (const t of [patients, items, carePlans, careSlots, doseLogs]) {
      expect(await count(db, t, "o1")).toBe(0);
      expect(await count(db, t, "o3")).toBeGreaterThan(0); // a organização de outra pessoa continua intacta
    }
    expect((await db.select().from(organization)).map((o) => o.id).sort()).toEqual(["o2", "o3"]);
    expect(await db.select().from(invitation)).toHaveLength(0);
    expect((await db.select().from(member)).map((m) => m.userId)).toEqual(["u3"]);
  });

  test("conta com outras pessoas: os dados ficam e o único dono sai passando a posse (admin tem preferência)", async () => {
    const db = await base();
    await db.insert(member).values([
      { id: "m1", organizationId: "o2", userId: "u1", role: "owner", createdAt: d("2026-01-01T00:00:00Z") },
      { id: "m2", organizationId: "o2", userId: "u2", role: "member", createdAt: d("2026-01-02T00:00:00Z") },
      { id: "m3", organizationId: "o2", userId: "u3", role: "admin", createdAt: d("2026-01-03T00:00:00Z") },
    ]);
    await fill(db, "o2", "u2");
    const r = await purgeUserData(db, "u1");
    expect(r).toEqual({ deletedOrganizations: [], leftOrganizations: ["o2"] });
    expect(await count(db, patients, "o2")).toBe(1);
    const roles = Object.fromEntries((await db.select().from(member)).map((m) => [m.userId, m.role]));
    expect(roles).toEqual({ u3: "owner", u2: "member" }); // o administrador virou dono; u1 saiu
  });

  test("assinatura: conta só do usuário leva a assinatura junto (cascata); a de outra conta e a de conta compartilhada ficam", async () => {
    const db = await base();
    await db.insert(member).values([
      { id: "m1", organizationId: "o1", userId: "u1", role: "owner", createdAt: new Date() },
      { id: "m2", organizationId: "o2", userId: "u1", role: "owner", createdAt: new Date() },
      { id: "m4", organizationId: "o2", userId: "u2", role: "member", createdAt: new Date() },
      { id: "m3", organizationId: "o3", userId: "u3", role: "owner", createdAt: new Date() },
    ]);
    const ate = new Date(Date.now() + 30 * 86_400_000);
    for (const o of ["o1", "o2", "o3"]) await grantPlus(db, o, ate, "apple");
    await purgeUserData(db, "u1");
    expect((await db.select().from(orgSubscriptions)).map((r) => r.organizationId).sort()).toEqual(["o2", "o3"]);
  });

  test("sem admin, o membro mais antigo vira dono", async () => {
    const db = await base();
    await db.insert(member).values([
      { id: "m1", organizationId: "o2", userId: "u1", role: "owner", createdAt: d("2026-01-01T00:00:00Z") },
      { id: "m2", organizationId: "o2", userId: "u3", role: "member", createdAt: d("2026-03-01T00:00:00Z") },
      { id: "m3", organizationId: "o2", userId: "u2", role: "member", createdAt: d("2026-02-01T00:00:00Z") },
    ]);
    await purgeUserData(db, "u1");
    const roles = Object.fromEntries((await db.select().from(member)).map((m) => [m.userId, m.role]));
    expect(roles).toEqual({ u2: "owner", u3: "member" });
  });

  test("quando já existe outro dono, ninguém é promovido", async () => {
    const db = await base();
    await db.insert(member).values([
      { id: "m1", organizationId: "o2", userId: "u1", role: "owner", createdAt: d("2026-01-01T00:00:00Z") },
      { id: "m2", organizationId: "o2", userId: "u2", role: "owner", createdAt: d("2026-01-02T00:00:00Z") },
      { id: "m3", organizationId: "o2", userId: "u3", role: "member", createdAt: d("2026-01-03T00:00:00Z") },
    ]);
    await purgeUserData(db, "u1");
    const roles = Object.fromEntries((await db.select().from(member)).map((m) => [m.userId, m.role]));
    expect(roles).toEqual({ u2: "owner", u3: "member" });
  });

  test("usuário em duas contas (uma só dele e outra compartilhada): só a dele é apagada", async () => {
    const db = await base();
    await db.insert(member).values([
      { id: "m1", organizationId: "o1", userId: "u1", role: "owner", createdAt: new Date() },
      { id: "m2", organizationId: "o2", userId: "u1", role: "member", createdAt: new Date() },
      { id: "m3", organizationId: "o2", userId: "u2", role: "owner", createdAt: new Date() },
    ]);
    await fill(db, "o1", "u1");
    await fill(db, "o2", "u2");
    const r = await purgeUserData(db, "u1");
    expect(r.deletedOrganizations).toEqual(["o1"]);
    expect(r.leftOrganizations).toEqual(["o2"]);
    expect(await count(db, patients, "o1")).toBe(0);
    expect(await count(db, patients, "o2")).toBe(1);
    // o histórico de doses de quem saiu continua legível: só fica sem o nome na tela
    expect((await db.select().from(member)).filter((m) => m.organizationId === "o2").map((m) => m.userId)).toEqual(["u2"]);
  });

  test("usuário sem nenhuma conta não falha", async () => {
    const db = await base();
    expect(await purgeUserData(db, "u1")).toEqual({ deletedOrganizations: [], leftOrganizations: [] });
  });

  test("apaga as inscrições de Web Push e os aparelhos do usuário, e só os dele", async () => {
    const db = await base();
    await saveSubscription(db, "u1", { endpoint: "https://p/1", keys: { p256dh: "p", auth: "a" } });
    await saveSubscription(db, "u2", { endpoint: "https://p/2", keys: { p256dh: "p", auth: "a" } });
    await saveDevice(db, "u1", { token: "ExponentPushToken[a]", platform: "ios" });
    await saveDevice(db, "u2", { token: "ExponentPushToken[b]", platform: "ios" });
    await purgeUserData(db, "u1");
    expect((await db.select().from(pushSubscriptions)).map((x) => x.userId)).toEqual(["u2"]);
    expect((await db.select().from(pushDevices)).map((x) => x.userId)).toEqual(["u2"]);
  });

  test("é atômico: se algo falha no meio, nada fica apagado", async () => {
    const db = await base();
    await db.insert(member).values({ id: "m1", organizationId: "o1", userId: "u1", role: "owner", createdAt: new Date() });
    await fill(db, "o1", "u1");
    await saveDevice(db, "u1", { token: "ExponentPushToken[a]", platform: "ios" });
    // Bomba: apagar a organização falha (depois de os dados dela já terem sido apagados dentro da transação).
    await db.execute(sql`create function boom() returns trigger as $$ begin raise exception 'boom'; end; $$ language plpgsql`);
    await db.execute(sql`create trigger boom_org before delete on organization for each row execute function boom()`);
    await expect(purgeUserData(db, "u1")).rejects.toThrow();
    expect(await count(db, patients, "o1")).toBe(1);
    expect(await count(db, doseLogs, "o1")).toBeGreaterThan(0);
    expect(await db.select().from(pushDevices).where(eq(pushDevices.userId, "u1"))).toHaveLength(1);
    expect(await db.select().from(organization).where(eq(organization.id, "o1"))).toHaveLength(1);
  });
});
