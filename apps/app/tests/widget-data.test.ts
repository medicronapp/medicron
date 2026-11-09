import type { EntryDto, HomeDto } from "@medicron/shared";
import { buildWidgetTimeline, signedOutProps } from "@/lib/widget-data";

// Brasília = UTC-3: "11:00Z" é 08:00 no widget.
const at = (hhmm: string, day = "2026-11-09") => new Date(`${day}T${hhmm}:00Z`);
const entry = (over: Partial<EntryDto> & { scheduledFor: string }): EntryDto => ({
  planId: "p1", patientId: "pa1", patientName: "Mel", itemName: "Losartana", kind: "medication", dose: "1 comprimido",
  reschedule: false, state: "later", resolvedBy: null, resolvedAt: null, late: false, value: null, note: null, ...over,
});
const home = (over: { attention?: EntryDto[]; entries?: EntryDto[]; total?: number } = {}): HomeDto => ({
  now: "2026-11-09T11:00:00Z", todayKey: "2026-11-09", selectedKey: "2026-11-09", selectedStatus: "open",
  streak: { days: 0, atRisk: false, pendingKeys: [] }, week: [],
  progress: { resolved: 0, total: over.total ?? (over.entries?.length ?? 0) }, closedToday: false,
  attention: over.attention ?? [],
  patients: [{ patientId: "pa1", patientName: "Mel", entries: over.entries ?? [], total: 0, resolved: 0, missed: 0 }],
});
const NOW = at("11:00"); // 08:00 em Brasília

describe("buildWidgetTimeline", () => {
  test("sem sessão: uma entrada signedOut, sem nenhum dado", () => {
    const t = buildWidgetTimeline(NOW, null);
    expect(t).toHaveLength(1);
    expect(t[0].props).toEqual(signedOutProps());
    expect(t[0].props.status).toBe("signedOut");
    expect(t[0].props.upcoming).toEqual([]);
    expect(t[0].props.pending).toEqual([]);
  });

  test("sem nenhuma dose hoje: empty", () => {
    const [first] = buildWidgetTimeline(NOW, home({ total: 0 }));
    expect(first.props.status).toBe("empty");
  });

  test("tudo resolvido: ok com listas vazias ('tudo em dia')", () => {
    const [first] = buildWidgetTimeline(NOW, home({ total: 3, entries: [entry({ scheduledFor: "2026-11-09T10:00:00Z", state: "done" })] }));
    expect(first.props.status).toBe("ok");
    expect(first.props.upcoming).toEqual([]);
    expect(first.props.pending).toEqual([]);
  });

  test("primeira entrada é agora: próximas em ordem, horário em Brasília, dose resolvida não aparece", () => {
    const h = home({ entries: [
      entry({ planId: "b", scheduledFor: "2026-11-09T15:00:00Z", itemName: "Vermífugo" }),
      entry({ planId: "a", scheduledFor: "2026-11-09T13:00:00Z", itemName: "Losartana" }),
      entry({ planId: "c", scheduledFor: "2026-11-09T10:00:00Z", state: "done", itemName: "Feita" }),
    ] });
    const [first] = buildWidgetTimeline(NOW, h);
    expect(first.date).toEqual(NOW);
    expect(first.props.status).toBe("ok");
    expect(first.props.upcoming.map((i) => [i.time, i.item])).toEqual([["10:00", "Losartana"], ["12:00", "Vermífugo"]]);
    expect(first.props.updatedAt).toBe("08:00");
  });

  test("a dose entra em 'agora' 15 min antes e vira atrasada 15 min depois, sem abrir o app", () => {
    const h = home({ entries: [entry({ scheduledFor: "2026-11-09T13:00:00Z" })] }); // 10:00
    const t = buildWidgetTimeline(NOW, h);
    const dates = t.map((e) => e.date.toISOString());
    expect(dates).toEqual(["2026-11-09T11:00:00.000Z", "2026-11-09T12:45:00.000Z", "2026-11-09T13:15:00.000Z", "2026-11-10T03:00:00.000Z"]); // a última é a meia-noite ("stale")
    expect(t[0].props.upcoming).toHaveLength(1);
    expect(t[0].props.pending).toHaveLength(0);
    expect(t[1].props.upcoming).toHaveLength(0);
    expect(t[1].props.pending).toEqual([expect.objectContaining({ time: "10:00", late: false })]);
    expect(t[2].props.pending).toEqual([expect.objectContaining({ time: "10:00", late: true })]);
  });

  test("lista longa: 3 próximas e as 2 pendentes MAIS RECENTES, com a contagem total", () => {
    const later = [14, 15, 16, 17, 18].map((h) => entry({ planId: `l${h}`, scheduledFor: `2026-11-09T${h}:00:00Z`, itemName: `L${h}` }));
    const missed = [5, 6, 7, 8].map((h) => entry({ planId: `m${h}`, scheduledFor: `2026-11-09T0${h}:00:00Z`, state: "missed", itemName: `M${h}` }));
    const [first] = buildWidgetTimeline(NOW, home({ attention: missed, entries: [...missed, ...later] }));
    expect(first.props.upcoming.map((i) => i.item)).toEqual(["L14", "L15", "L16"]);
    expect(first.props.upcomingCount).toBe(5);
    expect(first.props.pending.map((i) => i.item)).toEqual(["M8", "M7"]);
    expect(first.props.pendingCount).toBe(4);
    expect(first.props.pending.every((i) => i.late)).toBe(true);
  });

  test("a mesma dose em attention e em patients conta uma vez", () => {
    const m = entry({ planId: "m", scheduledFor: "2026-11-09T08:00:00Z", state: "missed" });
    const [first] = buildWidgetTimeline(NOW, home({ attention: [m], entries: [m] }));
    expect(first.props.pendingCount).toBe(1);
  });

  test("pendente de ontem mostra 'ontem'", () => {
    const m = entry({ planId: "y", scheduledFor: "2026-11-08T23:00:00Z", state: "missed" }); // 20:00 de ontem
    const [first] = buildWidgetTimeline(NOW, home({ attention: [m], total: 1 }));
    expect(first.props.pending[0].time).toBe("ontem 20:00");
  });

  test("a timeline segue em ordem crescente, tem no máximo 24 entradas e só avança até o fim do dia de Brasília", () => {
    const many = Array.from({ length: 30 }, (_, i) => entry({ planId: `x${i}`, scheduledFor: new Date(NOW.getTime() + (i + 1) * 20 * 60_000).toISOString() }));
    const t = buildWidgetTimeline(NOW, home({ entries: many }));
    expect(t.length).toBeLessThanOrEqual(24);
    const times = t.map((e) => e.date.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    const live = t.filter((e) => e.props.status !== "stale");
    expect(live.every((e) => e.date.getTime() <= at("02:59", "2026-11-10").getTime() + 59_000)).toBe(true);
  });

  test("à meia-noite de Brasília o widget deixa de afirmar o dia anterior: 'stale', sem listas", () => {
    const h = home({ entries: [entry({ scheduledFor: "2026-11-09T13:00:00Z" })] });
    const t = buildWidgetTimeline(NOW, h);
    const last = t[t.length - 1];
    expect(last.props.status).toBe("stale");
    expect(last.date).toEqual(at("03:00", "2026-11-10")); // 00:00 do dia seguinte em Brasília
    expect(last.props.upcoming).toEqual([]);
    expect(last.props.pending).toEqual([]);
    expect(t.slice(0, -1).every((e) => e.props.status !== "stale")).toBe(true);
  });

  test("dia sem doses também vira 'stale' à meia-noite; sem sessão nunca", () => {
    const empty = buildWidgetTimeline(NOW, home({ total: 0 }));
    expect(empty[empty.length - 1].props.status).toBe("stale");
    expect(buildWidgetTimeline(NOW, null).every((e) => e.props.status === "signedOut")).toBe(true);
  });

  test("nome longo é cortado para caber no widget", () => {
    const e = entry({ scheduledFor: "2026-11-09T13:00:00Z", itemName: "A".repeat(80), patientName: "B".repeat(80) });
    const [first] = buildWidgetTimeline(NOW, home({ entries: [e] }));
    expect(first.props.upcoming[0].item.length).toBeLessThanOrEqual(28);
    expect(first.props.upcoming[0].patient.length).toBeLessThanOrEqual(20);
    expect(first.props.upcoming[0].item.endsWith("…")).toBe(true);
  });
});
