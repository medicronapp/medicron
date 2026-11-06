import { describe, test, expect } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { carePlans, patients } from "@/lib/db/schema";
import { createItem, listItems, getItem, updateItem, archiveItem } from "@/lib/services/items";

describe("items", () => {
  test("lista por organização e filtra por tipo", async () => {
    const db = await createTestDb();
    await createItem(db, "o1", { name: "Amoxicilina", kind: "medication", defaultDose: "1 comprimido" });
    await createItem(db, "o1", { name: "Medir temperatura", kind: "procedure" });
    await createItem(db, "o2", { name: "Outro", kind: "medication" });
    expect(await listItems(db, "o1")).toHaveLength(2);
    expect((await listItems(db, "o1", "procedure")).map((i) => i.name)).toEqual(["Medir temperatura"]);
  });

  test("getItem/updateItem de outra organização devolvem null", async () => {
    const db = await createTestDb();
    const item = await createItem(db, "o1", { name: "X", kind: "medication" });
    expect(await getItem(db, "o2", item.id)).toBeNull();
    expect(await updateItem(db, "o2", item.id, { name: "Y", kind: "medication" })).toBeNull();
    expect((await updateItem(db, "o1", item.id, { name: "Y", kind: "procedure" }))?.kind).toBe("procedure");
  });

  test("tipo inválido e nome vazio são rejeitados", async () => {
    const db = await createTestDb();
    // @ts-expect-error tipo inválido de propósito
    await expect(createItem(db, "o1", { name: "A", kind: "outro" })).rejects.toThrow();
    await expect(createItem(db, "o1", { name: " ", kind: "medication" })).rejects.toThrow();
  });

  test("archiveItem some da lista e desativa os planos do item", async () => {
    const db = await createTestDb();
    const item = await createItem(db, "o1", { name: "X", kind: "medication" });
    const [patient] = await db.insert(patients).values({ organizationId: "o1", name: "Mimi" }).returning();
    const at = new Date();
    await db.insert(carePlans).values({
      organizationId: "o1", patientId: patient.id, itemId: item.id, intervalMinutes: 60, anchorAt: at, nextDueAt: at,
    });
    await archiveItem(db, "o1", item.id);
    expect(await listItems(db, "o1")).toEqual([]);
    expect((await db.select().from(carePlans))[0].active).toBe(false);
  });
});
