import { describe, test, expect } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { user, organization, member, pushSubscriptions } from "@/lib/db/schema";
import { saveSubscription, removeSubscription, listSubscriptionsForOrg } from "@/lib/services/push";

const sub = (endpoint: string) => ({ endpoint, keys: { p256dh: "p", auth: "a" } });

async function seed() {
  const db = await createTestDb();
  await db.insert(user).values([
    { id: "u1", name: "Ana", email: "a@x.com" },
    { id: "u2", name: "Bia", email: "b@x.com" },
  ]);
  await db.insert(organization).values([
    { id: "o1", name: "A", slug: "a", createdAt: new Date() },
    { id: "o2", name: "B", slug: "b", createdAt: new Date() },
  ]);
  await db.insert(member).values([
    { id: "m1", organizationId: "o1", userId: "u1", role: "owner", createdAt: new Date() },
    { id: "m2", organizationId: "o2", userId: "u2", role: "owner", createdAt: new Date() },
  ]);
  return db;
}

describe("push subscriptions", () => {
  test("salvar o mesmo endpoint duas vezes não duplica", async () => {
    const db = await seed();
    await saveSubscription(db, "u1", sub("https://push/1"));
    await saveSubscription(db, "u1", sub("https://push/1"));
    expect(await db.select().from(pushSubscriptions)).toHaveLength(1);
  });

  test("endpoint reaproveitado por outro usuário passa a pertencer a ele", async () => {
    const db = await seed();
    await saveSubscription(db, "u1", sub("https://push/1"));
    await saveSubscription(db, "u2", sub("https://push/1"));
    const rows = await db.select().from(pushSubscriptions);
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe("u2");
  });

  test("listSubscriptionsForOrg traz só membros da organização", async () => {
    const db = await seed();
    await saveSubscription(db, "u1", sub("https://push/1"));
    await saveSubscription(db, "u2", sub("https://push/2"));
    expect((await listSubscriptionsForOrg(db, "o1")).map((s) => s.endpoint)).toEqual(["https://push/1"]);
  });

  test("removeSubscription apaga", async () => {
    const db = await seed();
    await saveSubscription(db, "u1", sub("https://push/1"));
    await removeSubscription(db, "https://push/1");
    expect(await listSubscriptionsForOrg(db, "o1")).toEqual([]);
  });
});

describe("removeSubscription com dono", () => {
  test("outro usuário não consegue remover a inscrição alheia", async () => {
    const db = await seed();
    await saveSubscription(db, "u1", sub("https://push/1"));
    await removeSubscription(db, "https://push/1", "u2");
    expect(await listSubscriptionsForOrg(db, "o1")).toHaveLength(1);
    await removeSubscription(db, "https://push/1", "u1");
    expect(await listSubscriptionsForOrg(db, "o1")).toEqual([]);
  });
});

describe("vários aparelhos do mesmo usuário", () => {
  test("cada aparelho (endpoint) é uma inscrição própria e todos aparecem para a conta", async () => {
    const db = await seed();
    await saveSubscription(db, "u1", sub("https://push/celular"));
    await saveSubscription(db, "u1", sub("https://push/tablet"));
    await saveSubscription(db, "u1", sub("https://push/notebook"));
    const endpoints = (await listSubscriptionsForOrg(db, "o1")).map((s) => s.endpoint).sort();
    expect(endpoints).toEqual(["https://push/celular", "https://push/notebook", "https://push/tablet"]);
  });

  test("remover um aparelho não derruba os outros do mesmo usuário", async () => {
    const db = await seed();
    await saveSubscription(db, "u1", sub("https://push/celular"));
    await saveSubscription(db, "u1", sub("https://push/tablet"));
    await removeSubscription(db, "https://push/celular", "u1");
    expect((await listSubscriptionsForOrg(db, "o1")).map((s) => s.endpoint)).toEqual(["https://push/tablet"]);
  });

  test("reinscrever o mesmo aparelho atualiza as chaves sem criar duplicata", async () => {
    const db = await seed();
    await saveSubscription(db, "u1", sub("https://push/celular"));
    await saveSubscription(db, "u1", { endpoint: "https://push/celular", keys: { p256dh: "novo", auth: "novo" } });
    const rows = await listSubscriptionsForOrg(db, "o1");
    expect(rows).toHaveLength(1);
    expect(rows[0].p256dh).toBe("novo");
  });
});
