import { beforeEach, describe, expect, test, vi } from "vitest";
import { addDays, dayKey } from "@medicron/shared";
import { organization } from "@/lib/db/schema";
import { archivePatient, createPatient } from "@/lib/services/patients";
import { grantPlus } from "@/lib/services/subscription";
import { call, env, freshDb } from "./harness";
import { GET as list, POST as create } from "@/app/api/v1/patients/route";
import { GET as home } from "@/app/api/v1/home/route";

vi.mock("@/lib/db", async () => { const { env } = await import("./harness"); return { getDb: () => env.db }; });
vi.mock("@/lib/api/context", async () => {
  const { env } = await import("./harness");
  return { getApiContext: async () => { if (env.fail) throw env.fail; return env.ctx; } };
});

beforeEach(async () => {
  await freshDb();
  await env.db.insert(organization).values({ id: "o1", name: "Casa", slug: "casa", createdAt: new Date() });
});

const novo = (name: string) => call(create, "/api/v1/patients", { method: "POST", json: { name, species: "cat" } });
const diaAtras = (n: number) => addDays(dayKey(new Date()), -n);

describe("limite de pacientes (grátis: 2)", () => {
  test("o 3º paciente no grátis volta 402 plan_limit (limit=patients), em pt-BR, e NÃO cria", async () => {
    expect((await novo("A")).status).toBe(201);
    expect((await novo("B")).status).toBe(201);
    const r = await novo("C");
    expect(r.status).toBe(402);
    expect(r.body).toMatchObject({ error: "plan_limit", limit: "patients" });
    expect(r.body.message).toMatch(/Plus/);
    expect((await call(list, "/api/v1/patients")).body.patients).toHaveLength(2);
  });

  test("com o Plus ativo cria o 3º e quantos quiser", async () => {
    await grantPlus(env.db, "o1", new Date(Date.now() + 86_400_000), "manual");
    for (const n of ["A", "B", "C", "D"]) expect((await novo(n)).status).toBe(201);
  });

  test("arquivar um paciente libera uma vaga no grátis", async () => {
    const a = await createPatient(env.db, "o1", { name: "A" });
    await createPatient(env.db, "o1", { name: "B" });
    expect((await novo("C")).status).toBe(402);
    await archivePatient(env.db, "o1", a.id);
    expect((await novo("C")).status).toBe(201);
  });

  test("REGRA DE OURO: conta grátis acima do limite (3 pacientes) continua listando e abrindo o Hoje; nada é bloqueado", async () => {
    for (const n of ["A", "B", "C"]) await createPatient(env.db, "o1", { name: n }); // criados direto no serviço, como se fossem de quando era Plus
    expect((await call(list, "/api/v1/patients")).body.patients).toHaveLength(3);
    const h = await call(home, "/api/v1/home");
    expect(h.status).toBe(200);
    expect(h.body.hasPatients).toBe(true);
  });
});

describe("limite de histórico (grátis: 30 dias)", () => {
  test("dia com 31 dias volta 402 plan_limit (limit=history); o de 30 dias passa; o de hoje passa", async () => {
    await createPatient(env.db, "o1", { name: "A" });
    const velho = await call(home, `/api/v1/home?dia=${diaAtras(31)}`);
    expect(velho.status).toBe(402);
    expect(velho.body).toMatchObject({ error: "plan_limit", limit: "history" });
    expect((await call(home, `/api/v1/home?dia=${diaAtras(30)}`)).status).toBe(200);
    expect((await call(home, "/api/v1/home")).status).toBe(200);
  });

  test("com o Plus qualquer dia passado passa", async () => {
    await grantPlus(env.db, "o1", new Date(Date.now() + 86_400_000), "manual");
    expect((await call(home, `/api/v1/home?dia=${diaAtras(400)}`)).status).toBe(200);
  });

  test("Plus que venceu volta ao corte de 30 dias", async () => {
    await grantPlus(env.db, "o1", new Date(Date.now() - 1000), "apple");
    expect((await call(home, `/api/v1/home?dia=${diaAtras(31)}`)).status).toBe(402);
  });

  test("dia inválido continua sendo ignorado (não vira 402 nem 500)", async () => {
    expect((await call(home, "/api/v1/home?dia=2026-02-31")).status).toBe(200);
  });
});
