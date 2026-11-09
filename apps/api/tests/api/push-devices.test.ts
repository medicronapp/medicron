import { beforeEach, describe, expect, test, vi } from "vitest";
import { member, organization, user } from "@/lib/db/schema";
import { ApiError } from "@/lib/api/errors";
import { listDevicesForOrg, saveDevice } from "@/lib/services/push";
import { call, env, freshDb } from "./harness";
import { DELETE, POST } from "@/app/api/v1/push/devices/route";

vi.mock("@/lib/db", async () => { const { env } = await import("./harness"); return { getDb: () => env.db }; });
vi.mock("@/lib/api/context", async () => {
  const { env } = await import("./harness");
  return { getApiContext: async () => { if (env.fail) throw env.fail; return env.ctx; } };
});

const TOKEN = "ExponentPushToken[abc-123]";

beforeEach(async () => {
  const db = await freshDb();
  await db.insert(user).values([
    { id: "u1", name: "Ana", email: "a@x.com" },
    { id: "u2", name: "Bia", email: "b@x.com" },
  ]);
  await db.insert(organization).values({ id: "o1", name: "A", slug: "a", createdAt: new Date() });
  await db.insert(member).values({ id: "m1", organizationId: "o1", userId: "u1", role: "owner", createdAt: new Date() });
});

describe("POST /push/devices", () => {
  test("cadastra o aparelho do usuário (e repetir não duplica)", async () => {
    const r = await call(POST, "/api/v1/push/devices", { method: "POST", json: { token: TOKEN, platform: "ios" } });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true });
    await call(POST, "/api/v1/push/devices", { method: "POST", json: { token: TOKEN, platform: "ios" } });
    expect(await listDevicesForOrg(env.db, "o1")).toHaveLength(1);
  });

  test.each([
    [{ token: "abc", platform: "ios" }],
    [{ token: TOKEN, platform: "web" }],
    [{ platform: "ios" }],
  ])("corpo inválido %j: 400", async (json) => {
    const r = await call(POST, "/api/v1/push/devices", { method: "POST", json });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe("invalid_request");
  });

  test("sem sessão: 401", async () => {
    env.fail = new ApiError(401, "unauthorized", "É preciso entrar.");
    const r = await call(POST, "/api/v1/push/devices", { method: "POST", json: { token: TOKEN, platform: "ios" } });
    expect(r.status).toBe(401);
  });
});

describe("DELETE /push/devices", () => {
  test("apaga o próprio aparelho (204)", async () => {
    await saveDevice(env.db, "u1", { token: TOKEN, platform: "ios" });
    const r = await call(DELETE, "/api/v1/push/devices", { method: "DELETE", json: { token: TOKEN } });
    expect(r.status).toBe(204);
    expect(await listDevicesForOrg(env.db, "o1")).toHaveLength(0);
  });

  test("aparelho de outro usuário: 204 e não apaga", async () => {
    await saveDevice(env.db, "u2", { token: TOKEN, platform: "ios" });
    await env.db.insert(member).values({ id: "m2", organizationId: "o1", userId: "u2", role: "member", createdAt: new Date() });
    const r = await call(DELETE, "/api/v1/push/devices", { method: "DELETE", json: { token: TOKEN } });
    expect(r.status).toBe(204);
    expect(await listDevicesForOrg(env.db, "o1")).toHaveLength(1);
  });

  test("token inexistente é idempotente (204); sem token é 400", async () => {
    expect((await call(DELETE, "/api/v1/push/devices", { method: "DELETE", json: { token: TOKEN } })).status).toBe(204);
    expect((await call(DELETE, "/api/v1/push/devices", { method: "DELETE", json: {} })).status).toBe(400);
  });
});
