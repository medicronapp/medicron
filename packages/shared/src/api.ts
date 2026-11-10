import { z } from "zod";
import type { SubscriptionDto } from "./subscription";

export const API_PREFIX = "/api/v1" as const;

// ---------- Corpos de requisição (datas em texto ISO 8601) ----------

const species = z.enum(["cat", "dog", "human", "bird", "rabbit", "other"]);
const iso = z.string().datetime();

export const patientBody = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(60),
  species,
  birthDate: z.string().date().optional(),
  weightKg: z.number().positive().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type PatientBody = z.infer<typeof patientBody>;

export const itemBody = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(80),
  kind: z.enum(["medication", "procedure"]),
  defaultDose: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type ItemBody = z.infer<typeof itemBody>;

export const planCreateBody = z.object({
  itemId: z.string().min(1),
  intervalMinutes: z.number().int().min(5, "Intervalo mínimo de 5 minutos").max(60 * 24 * 365),
  anchorAt: iso,
  endAt: iso.optional(),
  dose: z.string().trim().max(120).optional(),
  reschedule: z.boolean().optional(),
});
export type PlanCreateBody = z.infer<typeof planCreateBody>;

export const planPatchBody = z.object({
  dose: z.string().trim().max(120).nullable().optional(),
  endAt: iso.nullable().optional(),
  reschedule: z.boolean().optional(),
});
export type PlanPatchBody = z.infer<typeof planPatchBody>;

/** Aparelho com o app nativo: token do Expo Push Service (`ExponentPushToken[...]` ou `ExpoPushToken[...]`) e plataforma. */
export const pushDeviceBody = z.object({
  token: z.string().regex(/^Expo(nent)?PushToken\[.+\]$/, "Token de notificação inválido"),
  platform: z.enum(["ios", "android"]),
});
export type PushDeviceBody = z.infer<typeof pushDeviceBody>;

export const doseBody = z.object({
  planId: z.string().min(1),
  scheduledFor: iso,
  outcome: z.enum(["done", "skipped"]),
  value: z.string().max(60).optional(),
  note: z.string().max(300).optional(),
  appliedAt: iso.optional(),
});
export type DoseBody = z.infer<typeof doseBody>;

// ---------- Respostas ----------

export type ErrorDto = { error: string; message?: string; issues?: unknown[]; minAppVersion?: string };

export type PatientDto = {
  id: string; name: string; species: z.infer<typeof species>;
  birthDate: string | null; weightKg: string | null; notes: string | null; createdAt: string;
};
export type ItemDto = {
  id: string; name: string; kind: "medication" | "procedure";
  defaultDose: string | null; notes: string | null; createdAt: string;
};
export type PlanDto = {
  id: string; patientId: string; itemId: string; item?: ItemDto; dose: string | null;
  intervalMinutes: number; anchorAt: string; endAt: string | null; active: boolean;
  reschedule: boolean; nextDueAt: string; createdAt: string;
};

export type OnboardingDto = {
  showWelcome: boolean;
  checklist: { show: boolean; steps: { patient: boolean; item: boolean; plan: boolean; push: boolean } };
};

export type DayStatusDto = "empty" | "ok" | "open" | "pending" | "lost";
export type EntryDto = {
  planId: string; scheduledFor: string; patientId: string; patientName: string; itemName: string;
  kind: "medication" | "procedure"; dose: string | null; reschedule: boolean;
  state: "done" | "skipped" | "missed" | "now" | "later";
  resolvedBy: string | null; resolvedAt: string | null; late: boolean; value: string | null; note: string | null;
};
export type HomeDto = {
  now: string; todayKey: string; selectedKey: string; selectedStatus: DayStatusDto;
  streak: { days: number; atRisk: boolean; pendingKeys: string[] };
  week: { key: string; status: DayStatusDto | "future"; isToday: boolean }[];
  progress: { resolved: number; total: number }; closedToday: boolean;
  attention: EntryDto[];
  patients: { patientId: string; patientName: string; entries: EntryDto[]; total: number; resolved: number; missed: number }[];
};

export type MeDto = {
  user: { id: string; name: string; email: string };
  orgId: string;
  role: "owner" | "admin" | "member";
  subscription: SubscriptionDto;
};
