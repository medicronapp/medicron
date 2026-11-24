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

import { POST as pause } from "@/app/api/v1/patients/[id]/pause/route";
import { POST as resume } from "@/app/api/v1/patients/[id]/resume/route";

describe("/patients/:id/pause e /resume", () => {
  test("pausar devolve o paciente com a data da pausa, ele segue na lista; retomar zera", async () => {
    const p = await createPatient(env.db, "o1", { name: "Mel", species: "cat" });
    const a = await call(pause, "/x", { method: "POST", ...withId(p.id) });
    expect(a.status).toBe(200);
    expect(a.body.patient.pausedAt).toEqual(expect.any(String));
    expect((await call(list, "/api/v1/patients")).body.patients[0].pausedAt).toEqual(a.body.patient.pausedAt);
    const b = await call(resume, "/x", { method: "POST", ...withId(p.id) });
    expect(b.status).toBe(200);
    expect(b.body.patient.pausedAt).toBeNull();
  });

  test("paciente de outra conta ou inexistente: 404", async () => {
    const alheio = await createPatient(env.db, "o2", { name: "Alheio", species: "dog" });
    expect((await call(pause, "/x", { method: "POST", ...withId(alheio.id) })).status).toBe(404);
    expect((await call(resume, "/x", { method: "POST", ...withId(alheio.id) })).status).toBe(404);
    expect((await call(pause, "/x", { method: "POST", ...withId("nao-existe") })).status).toBe(404);
  });

  test("plano grátis: pausar libera a vaga; retomar com a conta cheia é 402 plan_limit (sem contornar o limite)", async () => {
    const a = await createPatient(env.db, "o1", { name: "A", species: "cat" });
    await createPatient(env.db, "o1", { name: "B", species: "dog" });
    // conta cheia (2 de 2): não dá para criar o 3º
    expect((await call(create, "/api/v1/patients", { method: "POST", json: { name: "C", species: "cat" } })).status).toBe(402);
    await call(pause, "/x", { method: "POST", ...withId(a.id) });
    // com A pausada sobra uma vaga: cria o C
    expect((await call(create, "/api/v1/patients", { method: "POST", json: { name: "C", species: "cat" } })).status).toBe(201);
    // agora 2 ativos de novo: retomar A estoura o limite
    const r = await call(resume, "/x", { method: "POST", ...withId(a.id) });
    expect(r.status).toBe(402);
    expect(r.body.error).toBe("plan_limit");
    expect(r.body.limit).toBe("patients");
    expect((await call(get, "/x", withId(a.id))).body.patient.pausedAt).toEqual(expect.any(String)); // continua pausada
  });

  test("retomar quem não está pausado não bate no limite (nada muda)", async () => {
    const a = await createPatient(env.db, "o1", { name: "A", species: "cat" });
    await createPatient(env.db, "o1", { name: "B", species: "dog" });
    expect((await call(resume, "/x", { method: "POST", ...withId(a.id) })).status).toBe(200);
  });
});
