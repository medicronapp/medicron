import { beforeEach, describe, expect, test, vi } from "vitest";
import { user } from "@/lib/db/schema";
import { createItem } from "@/lib/services/items";
import { createPatient } from "@/lib/services/patients";
import { createPlan } from "@/lib/services/plans";
import { call, env, freshDb } from "./harness";
import { GET as home } from "@/app/api/v1/home/route";
import { POST as dose } from "@/app/api/v1/doses/route";
import { POST as welcome } from "@/app/api/v1/onboarding/welcome/route";
import { POST as dismiss } from "@/app/api/v1/onboarding/checklist/dismiss/route";

vi.mock("@/lib/db", async () => { const { env } = await import("./harness"); return { getDb: () => env.db }; });
vi.mock("@/lib/api/context", async () => {
  const { env } = await import("./harness");
  return { getApiContext: async () => { if (env.fail) throw env.fail; return env.ctx; } };
});

beforeEach(async () => {
  const db = await freshDb();
  await db.insert(user).values({ id: "u1", name: "Ana", email: "a@x.com" });
});

const H = 3600_000;
/** Rotina diária cujo primeiro horário foi há 2 horas (já vencido, dentro do dia). */
async function duePlan(org = "o1", reschedule = false) {
  const now = Date.now();
  const patient = await createPatient(env.db, org, { name: "Izzy", species: "cat" });
  const item = await createItem(env.db, org, { name: "Agemoxi", kind: "medication" });
  const anchorAt = new Date(now - 2 * H);
  const plan = await createPlan(env.db, org, {
    patientId: patient.id, itemId: item.id, intervalMinutes: 1440, anchorAt, now: new Date(now - 3 * H), reschedule,
  });
  return { plan, scheduledFor: anchorAt.toISOString() };
}

describe("GET /home", () => {
  test("conta vazia: sem pacientes e com as boas-vindas pendentes", async () => {
    const r = await call(home, "/api/v1/home");
    expect(r.status).toBe(200);
    expect(r.body.hasPatients).toBe(false);
    expect(r.body.onboarding.showWelcome).toBe(true);
    expect(r.body.home.patients).toEqual([]);
  });

  test("com paciente e rotina: hasPatients e cuidados do dia", async () => {
    await duePlan();
    const r = await call(home, "/api/v1/home");
    expect(r.body.hasPatients).toBe(true);
    expect(r.body.home.patients[0].patientName).toBe("Izzy");
    expect(r.body.home.attention.length).toBeGreaterThan(0);
  });

  test("dia inexistente no calendário é ignorado e devolve hoje", async () => {
    const r = await call(home, "/api/v1/home?dia=2026-02-31");
    expect(r.status).toBe(200);
    expect(r.body.home.selectedKey).toBe(r.body.home.todayKey);
  });
});

describe("POST /doses", () => {
  test("registrar; a mesma dose de novo devolve recorded:false e não é erro", async () => {
    const { plan, scheduledFor } = await duePlan();
    const json = { planId: plan.id, scheduledFor, outcome: "done" };
    expect((await call(dose, "/x", { method: "POST", json })).body).toEqual({ recorded: true });
    const again = await call(dose, "/x", { method: "POST", json });
    expect(again.status).toBe(200);
    expect(again.body).toEqual({ recorded: false, reason: "already" });
  });

  test("horário a mais de 15 minutos no futuro: 409 too_early", async () => {
    const { plan } = await duePlan();
    const r = await call(dose, "/x", { method: "POST", json: { planId: plan.id, scheduledFor: new Date(Date.now() + 3 * H).toISOString(), outcome: "done" } });
    expect(r.status).toBe(409);
    expect(r.body.error).toBe("too_early");
  });

  test("hora da aplicação no futuro em rotina que reprograma: 422", async () => {
    const { plan, scheduledFor } = await duePlan("o1", true);
    const r = await call(dose, "/x", { method: "POST", json: { planId: plan.id, scheduledFor, outcome: "done", appliedAt: new Date(Date.now() + H).toISOString() } });
    expect(r.status).toBe(422);
    expect(r.body.error).toBe("invalid_applied_at");
  });

  test("rotina de outra organização: 404; corpo inválido: 400", async () => {
    const { plan, scheduledFor } = await duePlan("o2");
    expect((await call(dose, "/x", { method: "POST", json: { planId: plan.id, scheduledFor, outcome: "done" } })).status).toBe(404);
    expect((await call(dose, "/x", { method: "POST", json: { planId: plan.id, scheduledFor, outcome: "later" } })).status).toBe(400);
  });
});

describe("onboarding", () => {
  test("concluir as boas-vindas e dispensar o checklist", async () => {
    expect((await call(welcome, "/x", { method: "POST" })).status).toBe(204);
    expect((await call(dismiss, "/x", { method: "POST" })).status).toBe(204);
    const r = await call(home, "/api/v1/home");
    expect(r.body.onboarding.showWelcome).toBe(false);
    expect(r.body.onboarding.checklist.show).toBe(false);
  });
});
