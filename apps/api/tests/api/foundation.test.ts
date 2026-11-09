import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { user } from "@/lib/db/schema";
import { NotFound } from "@/lib/errors";
import { Forbidden } from "@/lib/tenancy";
import { InvalidAppliedAt, TooEarly } from "@/lib/services/slots";
import { ApiError } from "@/lib/api/errors";
import { readJson, route } from "@/lib/api/route";
import { call, env, freshDb } from "./harness";
import { GET as me } from "@/app/api/v1/me/route";
import { GET as config } from "@/app/api/v1/config/route";

vi.mock("@/lib/db", async () => { const { env } = await import("./harness"); return { getDb: () => env.db }; });
vi.mock("@/lib/api/context", async () => {
  const { env } = await import("./harness");
  return { getApiContext: async () => { if (env.fail) throw env.fail; return env.ctx; } };
});

beforeEach(async () => {
  const db = await freshDb();
  await db.insert(user).values({ id: "u1", name: "Ana", email: "a@x.com" });
  process.env.MIN_APP_VERSION = "1.0.0";
});
afterEach(() => { delete process.env.MIN_APP_VERSION; vi.restoreAllMocks(); });

describe("GET /me", () => {
  test("sem sessão: 401 em JSON, sem redirecionar", async () => {
    env.fail = new ApiError(401, "unauthorized", "É preciso entrar.");
    const r = await call(me, "/api/v1/me");
    expect(r.status).toBe(401);
    expect(r.body).toMatchObject({ error: "unauthorized" });
  });

  test("com sessão: usuário, conta e papel", async () => {
    const r = await call(me, "/api/v1/me");
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ user: { id: "u1", name: "Ana", email: "a@x.com" }, orgId: "o1", role: "owner" });
  });

  test("sem conta: 403 no_organization", async () => {
    env.fail = new ApiError(403, "no_organization");
    expect((await call(me, "/api/v1/me")).body).toMatchObject({ error: "no_organization" });
  });
});

describe("versão mínima do app (x-app-version)", () => {
  const withVersion = (v?: string) => call(me, "/api/v1/me", { headers: v ? { "x-app-version": v } : {} });
  test("versão antiga: 426 com a versão mínima", async () => {
    const r = await withVersion("0.9.0");
    expect(r.status).toBe(426);
    expect(r.body).toMatchObject({ error: "app_outdated", minAppVersion: "1.0.0" });
  });
  test("igual, maior ou ausente (web): aceita", async () => {
    expect((await withVersion("1.0.0")).status).toBe(200);
    expect((await withVersion("1.10.2")).status).toBe(200);
    expect((await withVersion()).status).toBe(200);
  });
  test("lixo: 400 invalid_app_version", async () => {
    const r = await withVersion("abc");
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ error: "invalid_app_version" });
  });
});

describe("MIN_APP_VERSION inválida", () => {
  test("não derruba todos os clientes: cai em 0.0.0 e registra o erro", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.MIN_APP_VERSION = "abc";
    const r = await call(route(async () => Response.json({ ok: true })), "/x", { headers: { "x-app-version": "1.0.0" } });
    expect(r.status).toBe(200);
    expect(err).toHaveBeenCalled();
  });
});

describe("GET /config", () => {
  test("público: responde sem sessão e ignora a verificação de versão", async () => {
    env.fail = new ApiError(401, "unauthorized");
    const r = await call(config, "/api/v1/config", { headers: { "x-app-version": "0.1.0" } });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ minAppVersion: "1.0.0" });
  });
});

describe("route(): erros viram JSON", () => {
  const failing = (e: unknown) => route(async () => { throw e; });
  test.each([
    [new NotFound("Cuidado"), 404, "not_found"],
    [new Forbidden(), 403, "forbidden"],
    [new TooEarly(), 409, "too_early"],
    [new InvalidAppliedAt(), 422, "invalid_applied_at"],
  ])("%s", async (err, status, code) => {
    const r = await call(failing(err), "/x");
    expect(r.status).toBe(status);
    expect(r.body.error).toBe(code);
  });

  test("JSON malformado no corpo: 400 invalid_request", async () => {
    const h = route(async (req) => { await readJson(req, z.object({ a: z.string() })); return new Response(); });
    const r = await call(h, "/x", { method: "POST", rawBody: "{nao-json" });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe("invalid_request");
  });

  test("SyntaxError de um bug interno não vira 400: é 500 (não mascara o defeito)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await call(failing(new SyntaxError("Unexpected token")), "/x");
    expect(r.status).toBe(500);
    expect(r.body).toEqual({ error: "internal" });
  });

  test("ZodError: 400 invalid_request com issues", async () => {
    const r = await call(route(async () => { z.object({ a: z.string() }).parse({}); return new Response(); }), "/x");
    expect(r.status).toBe(400);
    expect(r.body.error).toBe("invalid_request");
    expect(r.body.issues.length).toBeGreaterThan(0);
  });

  test("erro desconhecido: 500 internal, sem vazar a mensagem", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await call(failing(new Error("senha=123 segredo")), "/x");
    expect(r.status).toBe(500);
    expect(r.body).toEqual({ error: "internal" });
  });
});
