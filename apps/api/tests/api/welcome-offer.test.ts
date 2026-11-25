import { beforeEach, describe, expect, test, vi } from "vitest";
import { call, env, freshDb } from "./harness";
import { member, organization, user } from "@/lib/db/schema";
import { POST as seen } from "@/app/api/v1/onboarding/welcome-offer/route";
import { GET as home } from "@/app/api/v1/home/route";

vi.mock("@/lib/db", async () => { const { env } = await import("./harness"); return { getDb: () => env.db }; });
vi.mock("@/lib/api/context", async () => {
  const { env } = await import("./harness");
  return { getApiContext: async () => { if (env.fail) throw env.fail; return env.ctx; } };
});

beforeEach(async () => {
  const db = await freshDb();
  await db.insert(user).values({ id: "u1", name: "Ana", email: "a@x.com" });
  await db.insert(organization).values({ id: "o1", name: "Casa", slug: "casa", createdAt: new Date() });
  await db.insert(member).values({ id: "m1", organizationId: "o1", userId: "u1", role: "owner", createdAt: new Date() });
});

describe("oferta de boas-vindas na API", () => {
  test("a Hoje informa a oferta; marcar como vista (204) a tira, e repetir é seguro", async () => {
    const a = await call(home, "/api/v1/home");
    expect(a.body.onboarding.welcomeOffer).toBe(true);
    expect((await call(seen, "/x", { method: "POST" })).status).toBe(204);
    expect((await call(seen, "/x", { method: "POST" })).status).toBe(204);
    expect((await call(home, "/api/v1/home")).body.onboarding.welcomeOffer).toBe(false);
  });
  test("sem login: 401", async () => {
    const { ApiError } = await import("@/lib/api/errors");
    env.fail = new ApiError(401, "unauthorized", "Não autorizado.");
    expect((await call(seen, "/x", { method: "POST" })).status).toBe(401);
    env.fail = undefined;
  });
});
