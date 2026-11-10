import {
  bigint, index, pgTable, pgEnum, text, integer, boolean, numeric, date, timestamp, unique,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth-schema";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const tz = (name: string) => timestamp(name, { withTimezone: true });

export const itemKind = pgEnum("item_kind", ["medication", "procedure"]);
export const patientSpecies = pgEnum("patient_species", ["cat", "dog", "human", "bird", "rabbit", "other"]);
export const doseOutcome = pgEnum("dose_outcome", ["done", "skipped"]);

export const patients = pgTable("patients", {
  id: id(),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  birthDate: date("birth_date"),
  weightKg: numeric("weight_kg"),
  species: patientSpecies("species").notNull(),
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
  patientId: text("patient_id").notNull().references(() => patients.id),
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

/** Aparelhos com o app nativo: o token do Expo Push Service de cada instalação (plataforma `ios` ou `android`). */
export const pushDevices = pgTable("push_devices", {
  id: id(),
  userId: text("user_id").notNull(),
  token: text("token").notNull().unique(),
  platform: text("platform", { enum: ["ios", "android"] }).notNull(),
  createdAt: createdAt(),
});

/**
 * Assinatura do Medicron Plus, uma linha por conta (organização). Sem linha = grátis. O Plus vale enquanto `plus_until` for
 * futuro. Quem grava é o webhook do RevenueCat (e o script de concessão manual); `last_event_ms` evita aplicar evento fora de ordem.
 */
export const orgSubscriptions = pgTable("org_subscriptions", {
  organizationId: text("organization_id").primaryKey().references(() => organization.id, { onDelete: "cascade" }),
  plusUntil: tz("plus_until"),
  source: text("source", { enum: ["apple", "google", "manual"] }),
  productId: text("product_id"),
  willRenew: boolean("will_renew").notNull().default(false),
  lastEventMs: bigint("last_event_ms", { mode: "number" }).notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Marcas de onboarding por usuário: ausência de linha ou de data = ainda não viu. */
export const userOnboarding = pgTable("user_onboarding", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  welcomeSeenAt: tz("welcome_seen_at"),
  checklistDoneAt: tz("checklist_done_at"),
});

export type Patient = typeof patients.$inferSelect;
export type Item = typeof items.$inferSelect;
export type CarePlan = typeof carePlans.$inferSelect;
export type CareSlot = typeof careSlots.$inferSelect;
export type DoseLog = typeof doseLogs.$inferSelect;
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type PushDeviceRow = typeof pushDevices.$inferSelect;
export type OrgSubscriptionRow = typeof orgSubscriptions.$inferSelect;
export * from "./auth-schema";
