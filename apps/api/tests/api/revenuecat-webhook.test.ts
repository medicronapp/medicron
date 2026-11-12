import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { member, organization, user } from "@/lib/db/schema";
import { getSubscription, grantPlus } from "@/lib/services/subscription";
import { call, env, freshDb } from "./harness";
import { POST as webhook } from "@/app/api/webhooks/revenuecat/route";
import { POST as sync } from "@/app/api/v1/subscription/sync/route";

vi.mock("@/lib/db", async () => { const { env } = await import("./harness"); return { getDb: () => env.db }; });
vi.mock("@/lib/api/context", async () => {
  const { env } = await import("./harness");
  return { getApiContext: async () => { if (env.fail) throw env.fail; return env.ctx; } };
});
vi.mock("@/lib/services/revenuecat", async (orig) => ({ ...(await orig<typeof import("@/lib/services/revenuecat")>()), fetchSubscriber: vi.fn() }));
import { BillingUnavailable, fetchSubscriber } from "@/lib/services/revenuecat";

const SECRET = "segredo-do-webhook";
const DAY = 86_400_000;
const body = (over: Record<string, unknown> = {}) => ({
  api_version: "1.0",
  event: { id: `e${Math.random()}`, type: "INITIAL_PURCHASE", app_user_id: "o1", product_id: "app.medicron.plus.annual", store: "APP_STORE", environment: "PRODUCTION", event_timestamp_ms: Date.now(), expiration_at_ms: Date.now() + 30 * DAY, ...over },
});
const post = (json: unknown, authorization?: string) => call(webhook, "/api/webhooks/revenuecat", { method: "POST", json, headers: authorization ? { authorization } : {} });
const sub = () => getSubscription(env.db, "o1", new Date());

beforeEach(async () => {
  await freshDb();
  vi.stubEnv("REVENUECAT_WEBHOOK_SECRET", SECRET);
  await env.db.insert(user).values({ id: "u1", name: "Ana", email: "a@x.com" });
  await env.db.insert(organization).values({ id: "o1", name: "Casa", slug: "casa", createdAt: new Date() });
  await env.db.insert(member).values({ id: "m1", organizationId: "o1", userId: "u1", role: "owner", createdAt: new Date() });
  vi.mocked(fetchSubscriber).mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); });

describe("POST /api/webhooks/revenuecat", () => {
  test("sem o cabeçalho Authorization ou com valor errado: 401 e NADA muda", async () => {
    expect((await post(body())).status).toBe(401);
    expect((await post(body(), "errado")).status).toBe(401);
    expect((await sub()).tier).toBe("free");
  });

  test("com o segredo (valor puro ou 'Bearer segredo'): 200 e a conta vira Plus", async () => {
    expect((await post(body(), SECRET)).status).toBe(200);
    expect((await sub()).tier).toBe("plus");
    await freshDb();
    await env.db.insert(organization).values({ id: "o1", name: "Casa", slug: "casa", createdAt: new Date() });
    expect((await post(body(), `Bearer ${SECRET}`)).status).toBe(200);
    expect((await sub()).tier).toBe("plus");
  });

  test("segredo não configurado no servidor: 503 (nunca aceita)", async () => {
    vi.stubEnv("REVENUECAT_WEBHOOK_SECRET", "");
    expect((await post(body(), "")).status).toBe(401);
    expect((await post(body(), "qualquer")).status).toBe(503);
  });

  test("corpo inválido: 400; evento ignorado (org inexistente): 200 com result 'ignored' (o RevenueCat não deve reenviar)", async () => {
    expect((await post({ foo: 1 }, SECRET)).status).toBe(400);
    expect((await call(webhook, "/api/webhooks/revenuecat", { method: "POST", rawBody: "{ruim", headers: { authorization: SECRET } })).status).toBe(400);
    const r = await post(body({ app_user_id: "nao-existe" }), SECRET);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ result: "ignored" });
  });

  test("TRANSFER real não traz app_user_id (só transferred_from/to): 200 'ignored', nunca 400 (senão o RevenueCat reenvia)", async () => {
    const r = await post({ api_version: "1.0", event: { id: "t1", type: "TRANSFER", event_timestamp_ms: Date.now(), transferred_from: ["o1"], transferred_to: ["o2"] } }, SECRET);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ result: "ignored" });
  });

  test("não exige sessão nem versão do app (é chamada pelo RevenueCat)", async () => {
    env.fail = new ApiError(401, "unauthorized");
    expect((await post(body(), SECRET)).status).toBe(200);
  });
});

describe("POST /api/v1/subscription/sync", () => {
  const entitlement = (days: number) => ({ plusExpiresAt: new Date(Date.now() + days * DAY), productId: "app.medicron.plus.annual", store: "app_store", willRenew: true });
  const run = () => call(sync, "/api/v1/subscription/sync", { method: "POST" });

  test("sem login: 401", async () => {
    env.fail = new ApiError(401, "unauthorized");
    expect((await run()).status).toBe(401);
  });

  test("membro comum: 403 (só dono ou administrador sincroniza/compra)", async () => {
    env.ctx = { ...env.ctx, role: "member" };
    expect((await run()).status).toBe(403);
    expect(fetchSubscriber).not.toHaveBeenCalled();
  });

  test("dono com entitlement ativo no RevenueCat: aplica o Plus e devolve a assinatura", async () => {
    vi.mocked(fetchSubscriber).mockResolvedValue(entitlement(30));
    const r = await run();
    expect(r.status).toBe(200);
    expect(r.body.subscription.tier).toBe("plus");
    expect(vi.mocked(fetchSubscriber)).toHaveBeenCalledWith("o1");
    expect((await sub()).source).toBe("apple");
  });

  test("sem entitlement ativo: continua grátis; e NUNCA derruba um Plus existente (manual ou de loja)", async () => {
    vi.mocked(fetchSubscriber).mockResolvedValue(null);
    expect((await run()).body.subscription.tier).toBe("free");
    await grantPlus(env.db, "o1", new Date(Date.now() + 60 * DAY), "manual");
    expect((await run()).body.subscription.tier).toBe("plus");
  });

  test("a sincronização nunca ENCURTA um Plus que já vale mais (ex.: fundador manual de 60 dias e loja de 30)", async () => {
    await grantPlus(env.db, "o1", new Date(Date.now() + 60 * DAY), "manual");
    vi.mocked(fetchSubscriber).mockResolvedValue(entitlement(30));
    const r = await run();
    expect(r.body.subscription.source).toBe("manual");
    expect(new Date(r.body.subscription.plusUntil).getTime()).toBeGreaterThan(Date.now() + 59 * DAY);
  });

  test("RevenueCat não configurado: 503; falha do RevenueCat: 502", async () => {
    vi.mocked(fetchSubscriber).mockRejectedValueOnce(new BillingUnavailable());
    expect((await run()).status).toBe(503);
    vi.mocked(fetchSubscriber).mockRejectedValueOnce(new Error("rede"));
    expect((await run()).status).toBe(502);
  });
});
