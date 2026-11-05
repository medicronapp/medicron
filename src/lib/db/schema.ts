import {
  index, pgTable, pgEnum, text, integer, boolean, numeric, date, timestamp, unique,
} from "drizzle-orm/pg-core";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const tz = (name: string) => timestamp(name, { withTimezone: true });

export const itemKind = pgEnum("item_kind", ["medication", "procedure"]);
export const doseOutcome = pgEnum("dose_outcome", ["done", "skipped"]);

export const cats = pgTable("cats", {
  id: id(),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  birthDate: date("birth_date"),
  weightKg: numeric("weight_kg"),
  notes: text("notes"),
  archivedAt: tz("archived_at"),
  createdAt: createdAt(),
});

export const items = pgTable("items", {
  id: id(),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  kind: itemKind("kind").notNull(),
  defaultDose: text("default_dose"),
  notes: text("notes"),
  archivedAt: tz("archived_at"),
  createdAt: createdAt(),
});

export const carePlans = pgTable("care_plans", {
  id: id(),
  organizationId: text("organization_id").notNull(),
  catId: text("cat_id").notNull().references(() => cats.id),
  itemId: text("item_id").notNull().references(() => items.id),
  dose: text("dose"),
  intervalMinutes: integer("interval_minutes").notNull(),
  anchorAt: tz("anchor_at").notNull(),
  endAt: tz("end_at"),
  active: boolean("active").notNull().default(true),
  reschedule: boolean("reschedule").notNull().default(false),
  nextDueAt: tz("next_due_at").notNull(),
  notifiedForDueAt: tz("notified_for_due_at"),
  startsAt: tz("starts_at").notNull().defaultNow(),
  slotsThrough: tz("slots_through"),
  createdAt: createdAt(),
});

export const doseLogs = pgTable(
  "dose_logs",
  {
    id: id(),
    organizationId: text("organization_id").notNull(),
    carePlanId: text("care_plan_id").notNull().references(() => carePlans.id),
    scheduledFor: tz("scheduled_for").notNull(),
    outcome: doseOutcome("outcome").notNull(),
    doneByUserId: text("done_by_user_id").notNull(),
    doneAt: tz("done_at").notNull().defaultNow(),
    value: text("value"),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [unique("dose_logs_plan_slot_unique").on(t.carePlanId, t.scheduledFor)],
);

/** Cada horário esperado de uma rotina. Resolver atualiza só a linha do horário; a rotina não muda. */
export const careSlots = pgTable(
  "care_slots",
  {
    id: id(),
    organizationId: text("organization_id").notNull(),
    carePlanId: text("care_plan_id").notNull().references(() => carePlans.id),
    scheduledFor: tz("scheduled_for").notNull(),
    outcome: doseOutcome("outcome"),
    resolvedByUserId: text("resolved_by_user_id"),
    resolvedAt: tz("resolved_at"),
    value: text("value"),
    note: text("note"),
    notifiedAt: tz("notified_at"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("care_slots_plan_slot_unique").on(t.carePlanId, t.scheduledFor),
    index("care_slots_org_scheduled_idx").on(t.organizationId, t.scheduledFor),
  ],
);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: id(),
  userId: text("user_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: createdAt(),
});

export type Cat = typeof cats.$inferSelect;
export type Item = typeof items.$inferSelect;
export type CarePlan = typeof carePlans.$inferSelect;
export type CareSlot = typeof careSlots.$inferSelect;
export type DoseLog = typeof doseLogs.$inferSelect;
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export * from "./auth-schema";
