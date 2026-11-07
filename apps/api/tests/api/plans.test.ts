import { beforeEach, describe, expect, test, vi } from "vitest";
import { createItem } from "@/lib/services/items";
import { createPatient } from "@/lib/services/patients";
import { call, env, freshDb } from "./harness";
import { GET as listPlans, POST as createPlan } from "@/app/api/v1/patients/[id]/plans/route";
import { DELETE as endPlan, PATCH as patchPlan } from "@/app/api/v1/plans/[id]/route";

vi.mock("@/lib/db", async () => { const { env } = await import("./harness"); return { getDb: () => env.db }; });
vi.mock("@/lib/api/context", async () => {
  const { env } = await import("./harness");
  return { getApiContext: async () => { if (env.fail) throw env.fail; return env.ctx; } };
});

beforeEach(async () => { await freshDb(); });
const withId = (id: string) => ({ params: { id } });
const body = (itemId: string, extra = {}) => ({ itemId, intervalMinutes: 480, anchorAt: "2026-11-06T12:00:00.000Z", ...extra });

async function setup() {
  const patient = await createPatient(env.db, "o1", { name: "Izzy", species: "cat" });
  const item = await createItem(env.db, "o1", { name: "Agemoxi", kind: "medication" });
  return { patient, item };
}

describe("/patients/:id/plans", () => {
  test("criar com reprogramação e listar com o item", async () => {
    const { patient, item } = await setup();
    const r = await call(createPlan, "/x", { method: "POST", json: body(item.id, { reschedule: true }), ...withId(patient.id) });
    expect(r.status).toBe(201);
    expect(r.body.plan).toMatchObject({ patientId: patient.id, itemId: item.id, intervalMinutes: 480, reschedule: true, active: true });
    const l = await call(listPlans, "/x", withId(patient.id));
    expect(l.body.plans).toHaveLength(1);
    expect(l.body.plans[0].item.name).toBe("Agemoxi");
  });

  test("paciente ou item de outra organização: 404", async () => {
    const { patient, item } = await setup();
    const alheioP = await createPatient(env.db, "o2", { name: "Alheio", species: "dog" });
    const alheioI = await createItem(env.db, "o2", { name: "Alheio", kind: "procedure" });
    expect((await call(listPlans, "/x", withId(alheioP.id))).status).toBe(404);
    expect((await call(createPlan, "/x", { method: "POST", json: body(item.id), ...withId(alheioP.id) })).status).toBe(404);
    expect((await call(createPlan, "/x", { method: "POST", json: body(alheioI.id), ...withId(patient.id) })).status).toBe(404);
  });

  test("intervalo de 1 minuto e data inválida: 400", async () => {
    const { patient, item } = await setup();
    expect((await call(createPlan, "/x", { method: "POST", json: body(item.id, { intervalMinutes: 1 }), ...withId(patient.id) })).status).toBe(400);
    expect((await call(createPlan, "/x", { method: "POST", json: body(item.id, { anchorAt: "amanhã" }), ...withId(patient.id) })).status).toBe(400);
  });

  test("data final antes da primeira dose: 422", async () => {
    const { patient, item } = await setup();
    const r = await call(createPlan, "/x", { method: "POST", json: body(item.id, { endAt: "2000-01-01T00:00:00.000Z" }), ...withId(patient.id) });
    expect(r.status).toBe(422);
    expect(r.body.error).toBe("end_before_next_dose");
  });
});

describe("/plans/:id", () => {
  async function plan() {
    const { patient, item } = await setup();
    const r = await call(createPlan, "/x", { method: "POST", json: body(item.id, { reschedule: true }), ...withId(patient.id) });
    return { patient, id: r.body.plan.id as string };
  }

  test("alterar dose e reprogramação", async () => {
    const { id } = await plan();
    const r = await call(patchPlan, "/x", { method: "PATCH", json: { reschedule: false, dose: "2 gotas" }, ...withId(id) });
    expect(r.status).toBe(200);
    expect(r.body.plan).toMatchObject({ reschedule: false, dose: "2 gotas" });
  });

  test("data final antes da próxima dose: 422; rotina de outra organização: 404", async () => {
    const { id } = await plan();
    const r = await call(patchPlan, "/x", { method: "PATCH", json: { endAt: "2000-01-01T00:00:00.000Z" }, ...withId(id) });
    expect(r.status).toBe(422);
    expect(r.body.error).toBe("end_before_next_dose");
    env.ctx = { ...env.ctx, orgId: "o2" };
    expect((await call(patchPlan, "/x", { method: "PATCH", json: { dose: "x" }, ...withId(id) })).status).toBe(404);
  });

  test("encerrar é idempotente e some da listagem", async () => {
    const { patient, id } = await plan();
    expect((await call(endPlan, "/x", { method: "DELETE", ...withId(id) })).status).toBe(204);
    expect((await call(endPlan, "/x", { method: "DELETE", ...withId(id) })).status).toBe(204);
    expect((await call(listPlans, "/x", withId(patient.id))).body.plans).toHaveLength(0);
  });
});
