import { beforeEach, describe, expect, test, vi } from "vitest";
import { createPatient } from "@/lib/services/patients";
import { call, env, freshDb } from "./harness";
import { GET as list, POST as create } from "@/app/api/v1/patients/route";
import { DELETE as archive, GET as get, PATCH as patch } from "@/app/api/v1/patients/[id]/route";

vi.mock("@/lib/db", async () => { const { env } = await import("./harness"); return { getDb: () => env.db }; });
vi.mock("@/lib/api/context", async () => {
  const { env } = await import("./harness");
  return { getApiContext: async () => { if (env.fail) throw env.fail; return env.ctx; } };
});

beforeEach(async () => { await freshDb(); });
const withId = (id: string) => ({ params: { id } });

describe("/patients", () => {
  test("criar e listar", async () => {
    const r = await call(create, "/api/v1/patients", { method: "POST", json: { name: "Izzy", species: "cat", weightKg: 4.2 } });
    expect(r.status).toBe(201);
    expect(r.body.patient).toMatchObject({ name: "Izzy", species: "cat", weightKg: "4.2" });
    const l = await call(list, "/api/v1/patients");
    expect(l.body.patients).toHaveLength(1);
    expect(l.body.patients[0].id).toBe(r.body.patient.id);
  });

  test("nome vazio: 400; corpo que não é JSON: 400 (nunca 500)", async () => {
    const a = await call(create, "/api/v1/patients", { method: "POST", json: { name: "", species: "cat" } });
    expect(a.status).toBe(400);
    expect(a.body.error).toBe("invalid_request");
    const b = await call(create, "/api/v1/patients", { method: "POST", rawBody: "{nao-e-json" });
    expect(b.status).toBe(400);
  });

  test("paciente de outra organização: 404", async () => {
    const alheio = await createPatient(env.db, "o2", { name: "Alheio", species: "dog" });
    expect((await call(get, "/x", { ...withId(alheio.id) })).status).toBe(404);
    expect((await call(patch, "/x", { method: "PATCH", json: { name: "Hack", species: "dog" }, ...withId(alheio.id) })).status).toBe(404);
    const l = await call(list, "/api/v1/patients");
    expect(l.body.patients).toHaveLength(0);
  });

  test("detalhe e alteração", async () => {
    const p = await createPatient(env.db, "o1", { name: "Rex", species: "cat" });
    expect((await call(get, "/x", withId(p.id))).body.patient.name).toBe("Rex");
    const r = await call(patch, "/x", { method: "PATCH", json: { name: "Nina", species: "dog" }, ...withId(p.id) });
    expect(r.status).toBe(200);
    expect(r.body.patient).toMatchObject({ name: "Nina", species: "dog" });
  });

  test("arquivar é idempotente e some da lista", async () => {
    const p = await createPatient(env.db, "o1", { name: "Rex", species: "cat" });
    expect((await call(archive, "/x", { method: "DELETE", ...withId(p.id) })).status).toBe(204);
    expect((await call(archive, "/x", { method: "DELETE", ...withId(p.id) })).status).toBe(204);
    expect((await call(list, "/api/v1/patients")).body.patients).toHaveLength(0);
    expect((await call(get, "/x", withId(p.id))).status).toBe(404);
  });
});
