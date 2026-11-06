import type { PatientDay, DayEntry, Home } from "@/lib/services/home";

export type SEntry = Omit<DayEntry, "scheduledFor" | "resolvedAt"> & { scheduledFor: string; resolvedAt: string | null };
export type SPatientDay = Omit<PatientDay, "entries"> & { entries: SEntry[] };
export type SHome = Omit<Home, "attention" | "patients"> & { attention: SEntry[]; patients: SPatientDay[]; now: string };

const entry = (e: DayEntry): SEntry => ({
  ...e, scheduledFor: e.scheduledFor.toISOString(), resolvedAt: e.resolvedAt?.toISOString() ?? null,
});

/** Datas viram texto ISO para atravessar a fronteira servidor → componente cliente. */
export function serializeHome(h: Home, now: Date): SHome {
  return {
    ...h, now: now.toISOString(),
    attention: h.attention.map(entry),
    patients: h.patients.map((c) => ({ ...c, entries: c.entries.map(entry) })),
  };
}
