import { test, expect } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { patients, items, carePlans, doseLogs } from "@/lib/db/schema";

test("insere gato, item, plano e log; log duplicado viola unique", async () => {
  const db = await createTestDb();
  const [patient] = await db.insert(patients).values({ organizationId: "o1", name: "Mimi" }).returning();
  const [item] = await db
    .insert(items)
    .values({ organizationId: "o1", name: "Amoxicilina", kind: "medication" })
    .returning();
  const at = new Date("2026-11-04T08:00:00Z");
  const [plan] = await db
    .insert(carePlans)
    .values({
      organizationId: "o1", patientId: patient.id, itemId: item.id,
      intervalMinutes: 480, anchorAt: at, nextDueAt: at,
    })
    .returning();
  const log = { organizationId: "o1", carePlanId: plan.id, scheduledFor: at, outcome: "done" as const, doneByUserId: "u1" };
  await db.insert(doseLogs).values(log);
  await expect(db.insert(doseLogs).values(log)).rejects.toThrow();
});

import { careSlots } from "@/lib/db/schema";

test("care_slots: unique (rotina, horário), campos de resolução e notificação nascem nulos, rotina ganha startsAt", async () => {
  const db = await createTestDb();
  const [patient] = await db.insert(patients).values({ organizationId: "o1", name: "Mimi" }).returning();
  const [item] = await db.insert(items).values({ organizationId: "o1", name: "X", kind: "medication" }).returning();
  const at = new Date("2026-11-04T11:00:00Z");
  const [plan] = await db.insert(carePlans).values({
    organizationId: "o1", patientId: patient.id, itemId: item.id, intervalMinutes: 360, anchorAt: at, nextDueAt: at,
  }).returning();
  expect(plan.startsAt).toBeInstanceOf(Date);
  expect(plan.slotsThrough).toBeNull();
  const [slot] = await db.insert(careSlots).values({ organizationId: "o1", carePlanId: plan.id, scheduledFor: at }).returning();
  expect(slot.outcome).toBeNull();
  expect(slot.resolvedAt).toBeNull();
  expect(slot.notifiedAt).toBeNull();
  await expect(db.insert(careSlots).values({ organizationId: "o1", carePlanId: plan.id, scheduledFor: at })).rejects.toThrow();
});
