import { beforeEach, describe, expect, test, vi } from "vitest";
import { createPatient } from "@/lib/services/patients";
import { call, env, freshDb } from "./harness";
import { member, organization, user } from "@/lib/db/schema";
import { GET as list, POST as create } from "@/app/api/v1/patients/route";
import { GET as get, PATCH as patch } from "@/app/api/v1/patients/[id]/route";
import { POST as notifications } from "@/app/api/v1/patients/[id]/notifications/route";
import { POST as pause } from "@/app/api/v1/patients/[id]/pause/route";

vi.mock("@/lib/db", async () => { const { env } = await import("./harness"); return { getDb: () => env.db }; });
vi.mock("@/lib/api/context", async () => {
  const { env } = await import("./harness");
  return { getApiContext: async () => { if (env.fail) throw env.fail; return env.ctx; } };
});

const withId = (id: string) => ({ params: { id } });

beforeEach(async () => {
  const db = await freshDb();
  await db.insert(user).values([{ id: "u1", name: "Ana", email: "a@x.com" }, { id: "u2", name: "Bia", email: "b@x.com" }]);
  await db.insert(organization).values({ id: "o1", name: "Casa", slug: "casa", createdAt: new Date() });
  await db.insert(member).values([
    { id: "m1", organizationId: "o1", userId: "u1", role: "owner", createdAt: new Date() },
    { id: "m2", organizationId: "o1", userId: "u2", role: "member", createdAt: new Date() },
  ]);
});

const as = (userId: string) => { env.ctx = { ...env.ctx, userId }; };

describe("avisos por paciente na API", () => {
  test("por padrão o paciente vem com notify: true (lista, detalhe e criação)", async () => {
    const created = await call(create, "/api/v1/patients", { method: "POST", json: { name: "Mel", species: "cat" } });
    expect(created.body.patient.notify).toBe(true);
    expect((await call(list, "/api/v1/patients")).body.patients[0].notify).toBe(true);
    expect((await call(get, "/x", withId(created.body.patient.id))).body.patient.notify).toBe(true);
  });

  test("desligar e ligar: a resposta, o detalhe e a lista refletem", async () => {
    const p = await createPatient(env.db, "o1", { name: "Mel", species: "cat" });
    const off = await call(notifications, "/x", { method: "POST", json: { enabled: false }, ...withId(p.id) });
    expect(off.status).toBe(200);
    expect(off.body.patient.notify).toBe(false);
    expect((await call(get, "/x", withId(p.id))).body.patient.notify).toBe(false);
    expect((await call(list, "/api/v1/patients")).body.patients[0].notify).toBe(false);
    const on = await call(notifications, "/x", { method: "POST", json: { enabled: true }, ...withId(p.id) });
    expect(on.body.patient.notify).toBe(true);
  });

  test("é pessoal: o que uma pessoa desliga não muda a outra", async () => {
    const p = await createPatient(env.db, "o1", { name: "Mel", species: "cat" });
    as("u1");
    await call(notifications, "/x", { method: "POST", json: { enabled: false }, ...withId(p.id) });
    as("u2");
    expect((await call(get, "/x", withId(p.id))).body.patient.notify).toBe(true);
    expect((await call(list, "/api/v1/patients")).body.patients[0].notify).toBe(true);
  });

  test("editar e pausar mantêm o interruptor da pessoa na resposta", async () => {
    const p = await createPatient(env.db, "o1", { name: "Mel", species: "cat" });
    await call(notifications, "/x", { method: "POST", json: { enabled: false }, ...withId(p.id) });
    const edited = await call(patch, "/x", { method: "PATCH", json: { name: "Mel 2", species: "cat" }, ...withId(p.id) });
    expect(edited.body.patient.notify).toBe(false);
    const paused = await call(pause, "/x", { method: "POST", ...withId(p.id) });
    expect(paused.body.patient.notify).toBe(false);
  });

  test("paciente de outra conta ou inexistente: 404; corpo inválido: 400", async () => {
    const alheio = await createPatient(env.db, "o2", { name: "Alheio", species: "dog" });
    expect((await call(notifications, "/x", { method: "POST", json: { enabled: false }, ...withId(alheio.id) })).status).toBe(404);
    expect((await call(notifications, "/x", { method: "POST", json: { enabled: false }, ...withId("nao-existe") })).status).toBe(404);
    const mine = await createPatient(env.db, "o1", { name: "Mel", species: "cat" });
    expect((await call(notifications, "/x", { method: "POST", json: { enabled: "talvez" }, ...withId(mine.id) })).status).toBe(400);
    expect((await call(notifications, "/x", { method: "POST", rawBody: "{nao-json", ...withId(mine.id) })).status).toBe(400);
  });
});
