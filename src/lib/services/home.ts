import { and, eq, gte, isNotNull, isNull, lte, or } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { carePlans, careSlots, cats, items, user } from "@/lib/db/schema";
import { computeStreak, dayStatus, type DayStatus, type SlotFacts, type Streak } from "@/lib/completeness";
import { ensureSlots, EARLY_WINDOW_MS } from "@/lib/services/slots";
import { addDays, dayBounds, dayKey, weekKeys, windowEnd } from "@/lib/time";

const LOOKBACK_DAYS = 90;
const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export type SlotState = "done" | "skipped" | "missed" | "now" | "later";

export type DayEntry = {
  planId: string; scheduledFor: Date; catId: string; catName: string; itemName: string;
  kind: "medication" | "procedure"; dose: string | null; state: SlotState;
  resolvedBy: string | null; resolvedAt: Date | null; late: boolean; value: string | null; note: string | null;
};
export type CatDay = { catId: string; catName: string; entries: DayEntry[]; total: number; resolved: number; missed: number };
export type Home = {
  todayKey: string; selectedKey: string; selectedStatus: DayStatus; streak: Streak;
  week: { key: string; status: DayStatus | "future"; isToday: boolean }[];
  progress: { resolved: number; total: number }; closedToday: boolean;
  attention: DayEntry[]; cats: CatDay[];
};

export async function getHome(db: Db, orgId: string, now: Date, selectedKey?: string): Promise<Home> {
  await ensureSlots(db, now, orgId);
  const todayKey = dayKey(now);
  const selected = selectedKey && KEY_RE.test(selectedKey) && selectedKey <= todayKey ? selectedKey : todayKey;
  const lowerBound = dayBounds(addDays(todayKey, -LOOKBACK_DAYS)).start;

  const rows = await db
    .select({
      slot: careSlots, plan: carePlans, catId: cats.id, catName: cats.name,
      itemName: items.name, kind: items.kind, userName: user.name,
    })
    .from(careSlots)
    .innerJoin(carePlans, eq(carePlans.id, careSlots.carePlanId))
    .innerJoin(cats, and(eq(cats.id, carePlans.catId), isNull(cats.archivedAt)))
    .innerJoin(items, and(eq(items.id, carePlans.itemId), isNull(items.archivedAt)))
    .leftJoin(user, eq(user.id, careSlots.resolvedByUserId))
    .where(and(
      eq(careSlots.organizationId, orgId),
      gte(careSlots.scheduledFor, lowerBound),
      or(eq(carePlans.active, true), isNotNull(careSlots.outcome), lte(careSlots.scheduledFor, now)),
    ));

  const entries: (DayEntry & { key: string })[] = rows.map(({ slot, plan, catId, catName, itemName, kind, userName }) => {
    const key = dayKey(slot.scheduledFor);
    const diff = slot.scheduledFor.getTime() - now.getTime();
    const state: SlotState = slot.outcome
      ? slot.outcome
      : diff < -EARLY_WINDOW_MS ? "missed" : diff <= EARLY_WINDOW_MS ? "now" : "later";
    return {
      key, planId: plan.id, scheduledFor: slot.scheduledFor, catId, catName, itemName, kind,
      dose: plan.dose, state, resolvedBy: userName ?? null, resolvedAt: slot.resolvedAt,
      late: slot.resolvedAt !== null && slot.resolvedAt.getTime() > windowEnd(key).getTime(),
      value: slot.value, note: slot.note,
    };
  });

  const byDay = new Map<string, SlotFacts[]>();
  for (const e of entries) {
    const facts: SlotFacts = {
      scheduledFor: e.scheduledFor,
      outcome: e.state === "done" || e.state === "skipped" ? e.state : null,
      resolvedAt: e.resolvedAt,
    };
    byDay.set(e.key, [...(byDay.get(e.key) ?? []), facts]);
  }
  const statuses = new Map<string, DayStatus>();
  for (const [key, facts] of byDay) if (key <= todayKey) statuses.set(key, dayStatus(facts, key, now));
  const earliestKey = [...statuses.keys()].sort()[0] ?? todayKey;

  const todays = entries.filter((e) => e.key === todayKey);
  const clean = (e: DayEntry & { key: string }): DayEntry => {
    const { key, ...rest } = e;
    void key;
    return rest;
  };

  const yesterdayStart = dayBounds(addDays(todayKey, -1)).start;
  const attention = entries
    .filter((e) => (e.state === "missed" || e.state === "now") && e.scheduledFor >= yesterdayStart)
    .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime())
    .map(clean);

  const groups = new Map<string, CatDay>();
  for (const e of entries.filter((x) => x.key === selected).sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime())) {
    const g = groups.get(e.catId) ?? { catId: e.catId, catName: e.catName, entries: [], total: 0, resolved: 0, missed: 0 };
    g.entries.push(clean(e));
    g.total += 1;
    if (e.state === "done" || e.state === "skipped") g.resolved += 1;
    if (e.state === "missed") g.missed += 1;
    groups.set(e.catId, g);
  }
  const oldestMissed = (g: CatDay) =>
    g.entries.find((e) => e.state === "missed")?.scheduledFor.getTime() ?? Number.POSITIVE_INFINITY;
  const catsOut = [...groups.values()].sort((a, b) => oldestMissed(a) - oldestMissed(b) || a.catName.localeCompare(b.catName, "pt-BR"));

  return {
    todayKey, selectedKey: selected, selectedStatus: statuses.get(selected) ?? "empty",
    streak: computeStreak(statuses, todayKey, earliestKey),
    week: weekKeys(todayKey).map((key) => ({
      key, isToday: key === todayKey, status: key > todayKey ? "future" : statuses.get(key) ?? "empty",
    })),
    progress: {
      resolved: todays.filter((e) => e.state === "done" || e.state === "skipped").length,
      total: todays.length,
    },
    closedToday: statuses.get(todayKey) === "ok",
    attention, cats: catsOut,
  };
}
