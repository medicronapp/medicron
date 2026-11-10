import { beforeEach, describe, expect, test, vi } from "vitest";
import { member, organization, user } from "@/lib/db/schema";
import { createPatient } from "@/lib/services/patients";
import { grantPlus } from "@/lib/services/subscription";
import { call, env, freshDb } from "./harness";
import { GET as me } from "@/app/api/v1/me/route";

vi.mock("@/lib/db", async () => { const { env } = await import("./harness"); return { getDb: () => env.db }; });
vi.mock("@/lib/api/context", async () => {
  const { env } = await import("./harness");
  return { getApiContext: async () => { if (env.fail) throw env.fail; return env.ctx; } };
});

beforeEach(async () => {
  const db = await freshDb();
  await db.insert(user).values([{ id: "u1", name: "Ana", email: "a@x.com" }, { id: "u2", name: "Bia", email: "b@x.com" }]);
  await db.insert(organization).values([
    { id: "o1", name: "Casa", slug: "casa", createdAt: new Date() },
    { id: "o2", name: "Outra", slug: "outra", createdAt: new Date() },
  ]);
  await db.insert(member).values([
    { id: "m1", organizationId: "o1", userId: "u1", role: "owner", createdAt: new Date() },
    { id: "m2", organizationId: "o2", userId: "u2", role: "owner", createdAt: new Date() },
  ]);
});

describe("GET /me: assinatura da conta", () => {
  test("conta grátis: tier free, limites do grátis e o uso real (pacientes e pessoas)", async () => {
    await createPatient(env.db, "o1", { name: "Izzy", species: "cat" });
    const r = await call(me, "/api/v1/me");
    expect(r.status).toBe(200);
    expect(r.body.user).toMatchObject({ id: "u1", name: "Ana" });
    expect(r.body.subscription).toEqual({
      tier: "free", plusUntil: null, source: null, willRenew: false,
      limits: { patients: 2, members: 2, historyDays: 30 }, usage: { patients: 1, members: 1 },
    });
  });

  test("conta Plus: tier plus, validade em ISO, origem e limites do Plus", async () => {
    const until = new Date(Date.now() + 5 * 86_400_000);
    await grantPlus(env.db, "o1", until, "apple", { willRenew: true });
    const r = await call(me, "/api/v1/me");
    expect(r.body.subscription).toMatchObject({ tier: "plus", plusUntil: until.toISOString(), source: "apple", willRenew: true });
    expect(r.body.subscription.limits).toEqual({ patients: null, members: 8, historyDays: null });
  });

  test("não vaza a assinatura nem o uso de outra conta", async () => {
    await grantPlus(env.db, "o2", new Date(Date.now() + 86_400_000), "google");
    await createPatient(env.db, "o2", { name: "Alheio", species: "dog" });
    const r = await call(me, "/api/v1/me");
    expect(r.body.subscription.tier).toBe("free");
    expect(r.body.subscription.usage.patients).toBe(0);
  });
});
