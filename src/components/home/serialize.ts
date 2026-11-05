import type { CatDay, DayEntry, Home } from "@/lib/services/home";

export type SEntry = Omit<DayEntry, "scheduledFor" | "resolvedAt"> & { scheduledFor: string; resolvedAt: string | null };
export type SCatDay = Omit<CatDay, "entries"> & { entries: SEntry[] };
export type SHome = Omit<Home, "attention" | "cats"> & { attention: SEntry[]; cats: SCatDay[]; now: string };

const entry = (e: DayEntry): SEntry => ({
  ...e, scheduledFor: e.scheduledFor.toISOString(), resolvedAt: e.resolvedAt?.toISOString() ?? null,
});

/** Datas viram texto ISO para atravessar a fronteira servidor → componente cliente. */
export function serializeHome(h: Home, now: Date): SHome {
  return {
    ...h, now: now.toISOString(),
    attention: h.attention.map(entry),
    cats: h.cats.map((c) => ({ ...c, entries: c.entries.map(entry) })),
  };
}
