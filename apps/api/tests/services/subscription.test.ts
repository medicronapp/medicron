import { describe, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-db";
import { member, organization, orgSubscriptions, user } from "@/lib/db/schema";
import { archivePatient, createPatient } from "@/lib/services/patients";
import { getSubscription, grantPlus } from "@/lib/services/subscription";

const NOW = new Date("2026-11-10T15:00:00.000Z");
const day = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

async function base() {
  const db = await createTestDb();
  await db.insert(user).values([
    { id: "u1", name: "Ana", email: "a@x.com" },
    { id: "u2", name: "Bia", email: "b@x.com" },
  ]);
  await db.insert(organization).values({ id: "o1", name: "Casa", slug: "casa", createdAt: NOW });
  await db.insert(member).values([
    { id: "m1", organizationId: "o1", userId: "u1", role: "owner", createdAt: NOW },
    { id: "m2", organizationId: "o1", userId: "u2", role: "member", createdAt: NOW },
  ]);
  return db;
}

describe("getSubscription", () => {
  test("conta sem linha é grátis, com os limites do grátis e o uso real (paciente arquivado não conta)", async () => {
    const db = await base();
    const a = await createPatient(db, "o1", { name: "Ana" });
    await createPatient(db, "o1", { name: "Mel", species: "dog" });
    const c = await createPatient(db, "o1", { name: "Pedro" });
    await archivePatient(db, "o1", c.id);
    const s = await getSubscription(db, "o1", NOW);
    expect(s).toEqual({
      tier: "free", plusUntil: null, source: null, willRenew: false,
      limits: { patients: 2, members: 2, historyDays: 30 }, usage: { patients: 2, members: 2 },
    });
    expect(a.id).toBeTruthy();
  });

  test("depois de grantPlus a conta é Plus até a validade, com os limites do Plus", async () => {
    const db = await base();
    await grantPlus(db, "o1", day(30), "manual");
    const s = await getSubscription(db, "o1", NOW);
    expect(s.tier).toBe("plus");
    expect(s.plusUntil).toBe(day(30).toISOString());
    expect(s.source).toBe("manual");
    expect(s.limits).toEqual({ patients: null, members: 8, historyDays: null });
  });

  test("depois da validade volta a ser grátis, sem apagar nada (pacientes e linha continuam)", async () => {
    const db = await base();
    await createPatient(db, "o1", { name: "A" });
    await createPatient(db, "o1", { name: "B" });
    await createPatient(db, "o1", { name: "C" }); // 3º: só possível porque o serviço de criação não limita
    await grantPlus(db, "o1", day(1), "apple");
    const later = await getSubscription(db, "o1", day(2));
    expect(later.tier).toBe("free");
    expect(later.usage.patients).toBe(3); // acima do limite do grátis, mas nada foi tirado
    expect((await db.select().from(orgSubscriptions)).length).toBe(1);
  });

  test("grantPlus é upsert: uma linha só, atualizada; guarda produto, renovação e o evento", async () => {
    const db = await base();
    await grantPlus(db, "o1", day(30), "apple", { productId: "app.medicron.plus.annual", willRenew: true, eventMs: 1000 });
    await grantPlus(db, "o1", day(60), "google", { willRenew: false, eventMs: 2000 });
    const rows = await db.select().from(orgSubscriptions);
    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe("google");
    expect(rows[0].willRenew).toBe(false);
    expect(Number(rows[0].lastEventMs)).toBe(2000);
    expect(rows[0].plusUntil?.toISOString()).toBe(day(60).toISOString());
  });

  test("apagar a organização apaga a assinatura (cascata)", async () => {
    const db = await base();
    await grantPlus(db, "o1", day(30), "manual");
    await db.delete(organization).where(eq(organization.id, "o1"));
    expect(await db.select().from(orgSubscriptions)).toHaveLength(0);
  });
});
