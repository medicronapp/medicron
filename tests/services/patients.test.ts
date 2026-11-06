import { describe, test, expect } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { carePlans, items } from "@/lib/db/schema";
import { createPatient, listPatients, getPatient, updatePatient, archivePatient } from "@/lib/services/patients";

describe("patients", () => {
  test("cria e lista por organização, ordenado por nome", async () => {
    const db = await createTestDb();
    await createPatient(db, "o1", { name: "Zeca" });
    await createPatient(db, "o1", { name: "Alfa" });
    await createPatient(db, "o2", { name: "Outro" });
    expect((await listPatients(db, "o1")).map((c) => c.name)).toEqual(["Alfa", "Zeca"]);
  });

  test("getPatient de outra organização devolve null", async () => {
    const db = await createTestDb();
    const patient = await createPatient(db, "o1", { name: "Mimi" });
    expect(await getPatient(db, "o2", patient.id)).toBeNull();
    expect((await getPatient(db, "o1", patient.id))?.name).toBe("Mimi");
  });

  test("updatePatient de outra organização devolve null e não altera", async () => {
    const db = await createTestDb();
    const patient = await createPatient(db, "o1", { name: "Mimi" });
    expect(await updatePatient(db, "o2", patient.id, { name: "Hack" })).toBeNull();
    expect((await updatePatient(db, "o1", patient.id, { name: "Nina", weightKg: 4.2 }))?.name).toBe("Nina");
  });

  test("nome vazio é rejeitado", async () => {
    const db = await createTestDb();
    await expect(createPatient(db, "o1", { name: "   " })).rejects.toThrow();
  });

  test("archivePatient some da lista e desativa os planos do gato", async () => {
    const db = await createTestDb();
    const patient = await createPatient(db, "o1", { name: "Mimi" });
    const [item] = await db.insert(items).values({ organizationId: "o1", name: "X", kind: "medication" }).returning();
    const at = new Date();
    const [plan] = await db.insert(carePlans).values({
      organizationId: "o1", patientId: patient.id, itemId: item.id, intervalMinutes: 60, anchorAt: at, nextDueAt: at,
    }).returning();
    await archivePatient(db, "o1", patient.id);
    expect(await listPatients(db, "o1")).toEqual([]);
    const [after] = await db.select().from(carePlans);
    expect(after.id).toBe(plan.id);
    expect(after.active).toBe(false);
  });

  test("archivePatient de outra organização não afeta o gato", async () => {
    const db = await createTestDb();
    const patient = await createPatient(db, "o1", { name: "Mimi" });
    await archivePatient(db, "o2", patient.id);
    expect(await listPatients(db, "o1")).toHaveLength(1);
  });
});
