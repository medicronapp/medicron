import { beforeEach, describe, expect, test, vi } from "vitest";
import { createItem } from "@/lib/services/items";
import { call, env, freshDb } from "./harness";
import { GET as list, POST as create } from "@/app/api/v1/items/route";
import { DELETE as archive, GET as get, PATCH as patch } from "@/app/api/v1/items/[id]/route";

vi.mock("@/lib/db", async () => { const { env } = await import("./harness"); return { getDb: () => env.db }; });
vi.mock("@/lib/api/context", async () => {
  const { env } = await import("./harness");
  return { getApiContext: async () => { if (env.fail) throw env.fail; return env.ctx; } };
});

beforeEach(async () => { await freshDb(); });
const withId = (id: string) => ({ params: { id } });

describe("/items", () => {
  test("criar e filtrar por tipo", async () => {
    const r = await call(create, "/api/v1/items", { method: "POST", json: { name: "Agemoxi", kind: "medication" } });
    expect(r.status).toBe(201);
    expect(r.body.item).toMatchObject({ name: "Agemoxi", kind: "medication" });
    expect((await call(list, "/api/v1/items?kind=medication")).body.items).toHaveLength(1);
    expect((await call(list, "/api/v1/items?kind=procedure")).body.items).toHaveLength(0);
    expect((await call(list, "/api/v1/items")).body.items).toHaveLength(1);
  });

  test("tipo inválido na consulta: 400; criar sem nome: 400", async () => {
    expect((await call(list, "/api/v1/items?kind=outro")).status).toBe(400);
    expect((await call(create, "/api/v1/items", { method: "POST", json: { kind: "medication" } })).status).toBe(400);
  });

  test("item de outra organização: 404", async () => {
    const alheio = await createItem(env.db, "o2", { name: "Alheio", kind: "procedure" });
    expect((await call(get, "/x", withId(alheio.id))).status).toBe(404);
    expect((await call(patch, "/x", { method: "PATCH", json: { name: "Hack", kind: "procedure" }, ...withId(alheio.id) })).status).toBe(404);
  });

  test("alterar a dose padrão", async () => {
    const i = await createItem(env.db, "o1", { name: "Agemoxi", kind: "medication" });
    const r = await call(patch, "/x", { method: "PATCH", json: { name: "Agemoxi", kind: "medication", defaultDose: "1/2 comprimido" }, ...withId(i.id) });
    expect(r.status).toBe(200);
    expect(r.body.item.defaultDose).toBe("1/2 comprimido");
  });

  test("arquivar é idempotente e some da lista", async () => {
    const i = await createItem(env.db, "o1", { name: "Agemoxi", kind: "medication" });
    expect((await call(archive, "/x", { method: "DELETE", ...withId(i.id) })).status).toBe(204);
    expect((await call(archive, "/x", { method: "DELETE", ...withId(i.id) })).status).toBe(204);
    expect((await call(list, "/api/v1/items")).body.items).toHaveLength(0);
  });
});
