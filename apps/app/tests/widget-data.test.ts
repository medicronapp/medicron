import type { EntryDto, HomeDto } from "@medicron/shared";
import { buildWidgetTimeline, signedOutProps } from "@/lib/widget-data";

// Brasília = UTC-3: "11:00Z" é 08:00 no widget.
const at = (hhmm: string, day = "2026-11-09") => new Date(`${day}T${hhmm}:00Z`);
const entry = (over: Partial<EntryDto> & { scheduledFor: string }): EntryDto => ({
  planId: "p1", patientId: "pa1", patientName: "Mel", itemName: "Losartana", kind: "medication", dose: "1 comprimido",
  reschedule: false, state: "later", resolvedBy: null, resolvedAt: null, late: false, value: null, note: null, ...over,
});
const home = (over: { attention?: EntryDto[]; entries?: EntryDto[]; total?: number; resolved?: number } = {}): HomeDto => ({
  now: "2026-11-09T11:00:00Z", todayKey: "2026-11-09", selectedKey: "2026-11-09", selectedStatus: "open",
  streak: { days: 0, atRisk: false, pendingKeys: [] }, week: [],
  progress: { resolved: over.resolved ?? 0, total: over.total ?? (over.entries?.length ?? 0) }, closedToday: false,
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
    expect(t[0].props.pendingCount).toBe(0);
  });

  test("sem nenhuma dose hoje: empty", () => {
    expect(buildWidgetTimeline(NOW, home({ total: 0 }))[0].props.status).toBe("empty");
  });

  test("o anel do dia vem do progresso da Hoje (feitas / total)", () => {
    const [first] = buildWidgetTimeline(NOW, home({ total: 5, resolved: 3, entries: [entry({ scheduledFor: "2026-11-09T13:00:00Z" })] }));
    expect(first.props.resolved).toBe(3);
    expect(first.props.total).toBe(5);
  });

  test("tudo resolvido: ok sem próximas e sem pendentes ('tudo em dia'), anel cheio", () => {
    const [first] = buildWidgetTimeline(NOW, home({ total: 3, resolved: 3, entries: [entry({ scheduledFor: "2026-11-09T10:00:00Z", state: "done" })] }));
    expect(first.props).toMatchObject({ status: "ok", resolved: 3, total: 3, upcoming: [], pendingCount: 0, pendingSince: "" });
  });

  test("as 2 próximas, em ordem, com horário em Brasília e o instante exato (a contagem 'em 3 h' é do sistema)", () => {
    const h = home({ entries: [
      entry({ planId: "c", scheduledFor: "2026-11-09T17:00:00Z", itemName: "Vermífugo" }),
      entry({ planId: "b", scheduledFor: "2026-11-09T15:00:00Z", itemName: "Insulina" }),
      entry({ planId: "a", scheduledFor: "2026-11-09T13:00:00Z", itemName: "Losartana" }),
      entry({ planId: "d", scheduledFor: "2026-11-09T10:00:00Z", state: "done", itemName: "Feita" }),
    ] });
    const [first] = buildWidgetTimeline(NOW, h);
    expect(first.date).toEqual(NOW);
    expect(first.props.upcoming).toEqual([
      { time: "10:00", item: "Losartana", patient: "Mel", at: at("13:00").getTime() },
      { time: "12:00", item: "Insulina", patient: "Mel", at: at("15:00").getTime() },
    ]);
  });

  test("a dose entra em 'agora' 15 min antes (sai das próximas, conta como pendente) e vira atrasada 15 min depois", () => {
    const h = home({ entries: [entry({ scheduledFor: "2026-11-09T13:00:00Z" })] }); // 10:00
    const t = buildWidgetTimeline(NOW, h);
    expect(t.map((e) => e.date.toISOString())).toEqual(["2026-11-09T11:00:00.000Z", "2026-11-09T12:45:00.000Z", "2026-11-09T13:15:00.000Z", "2026-11-10T03:00:00.000Z"]);
    expect(t[0].props).toMatchObject({ pendingCount: 0 });
    expect(t[0].props.upcoming).toHaveLength(1);
    expect(t[1].props.upcoming).toHaveLength(0);
    expect(t[1].props).toMatchObject({ pendingCount: 1, pendingSince: "10:00" });
    expect(t[2].props).toMatchObject({ pendingCount: 1, pendingSince: "10:00" });
  });

  test("pendentes: a contagem total e 'desde' a mais antiga", () => {
    const missed = [5, 6, 7, 8].map((h) => entry({ planId: `m${h}`, scheduledFor: `2026-11-09T0${h}:00:00Z`, state: "missed", itemName: `M${h}` }));
    const [first] = buildWidgetTimeline(NOW, home({ attention: missed, entries: missed, total: 4 }));
    expect(first.props.pendingCount).toBe(4);
    expect(first.props.pendingSince).toBe("02:00"); // 05:00Z = 02:00 em Brasília
  });

  test("a mesma dose em attention e em patients conta uma vez", () => {
    const m = entry({ planId: "m", scheduledFor: "2026-11-09T08:00:00Z", state: "missed" });
    expect(buildWidgetTimeline(NOW, home({ attention: [m], entries: [m] }))[0].props.pendingCount).toBe(1);
  });

  test("pendente de ontem mostra 'ontem' em 'desde'", () => {
    const m = entry({ planId: "y", scheduledFor: "2026-11-08T23:00:00Z", state: "missed" }); // 20:00 de ontem
    expect(buildWidgetTimeline(NOW, home({ attention: [m], total: 1 }))[0].props.pendingSince).toBe("ontem 20:00");
  });

  test("a timeline segue em ordem crescente, tem no máximo 24 entradas e só avança até o fim do dia de Brasília", () => {
    const many = Array.from({ length: 30 }, (_, i) => entry({ planId: `x${i}`, scheduledFor: new Date(NOW.getTime() + (i + 1) * 20 * 60_000).toISOString() }));
    const t = buildWidgetTimeline(NOW, home({ entries: many }));
    expect(t.length).toBeLessThanOrEqual(24);
    const times = t.map((e) => e.date.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(t.filter((e) => e.props.status !== "stale").every((e) => e.date.getTime() <= at("02:59", "2026-11-10").getTime() + 59_000)).toBe(true);
  });

  test("à meia-noite de Brasília o widget deixa de afirmar o dia anterior: 'stale', sem dados", () => {
    const t = buildWidgetTimeline(NOW, home({ entries: [entry({ scheduledFor: "2026-11-09T13:00:00Z" })] }));
    const last = t[t.length - 1];
    expect(last.props.status).toBe("stale");
    expect(last.date).toEqual(at("03:00", "2026-11-10"));
    expect(last.props).toMatchObject({ upcoming: [], pendingCount: 0, resolved: 0, total: 0 });
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

describe("o que vai para o armazenamento do App Group (UserDefaults do iOS)", () => {
  // O módulo nativo grava as props num dicionário de UserDefaults, que só aceita valores simples: `null` (NSNull) faz a
  // gravação falhar e o widget fica para sempre com o estado inicial.
  const plist = (v: unknown, path = "props"): string[] => {
    if (v === null || v === undefined) return [`${path} é ${v}`];
    if (Array.isArray(v)) return v.flatMap((x, i) => plist(x, `${path}[${i}]`));
    if (typeof v === "object") return Object.entries(v as object).flatMap(([k, x]) => plist(x, `${path}.${k}`));
    return typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? [] : [`${path} tem tipo ${typeof v}`];
  };

  test("nenhuma prop é null, undefined ou tipo que o UserDefaults não aceita (dose sem valor inclusive)", () => {
    const h = home({
      attention: [entry({ planId: "m", scheduledFor: "2026-11-09T08:00:00Z", state: "missed", dose: null })],
      entries: [entry({ planId: "a", scheduledFor: "2026-11-09T13:00:00Z", dose: null }), entry({ planId: "b", scheduledFor: "2026-11-09T14:00:00Z", dose: "5 ml" })],
    });
    for (const e of buildWidgetTimeline(NOW, h)) expect(plist(e.props)).toEqual([]);
    for (const e of buildWidgetTimeline(NOW, null)) expect(plist(e.props)).toEqual([]);
    expect(plist(signedOutProps())).toEqual([]);
  });

  test("os instantes vão como número (timestamp), nunca como Date, e as chaves são só as que o widget usa", () => {
    const [first] = buildWidgetTimeline(NOW, home({ entries: [entry({ scheduledFor: "2026-11-09T13:00:00Z", dose: "1 comprimido" })] }));
    expect(Object.keys(first.props.upcoming[0]).sort()).toEqual(["at", "item", "patient", "time"]);
    expect(typeof first.props.upcoming[0].at).toBe("number");
    expect(Object.keys(first.props).sort()).toEqual(["pendingCount", "pendingSince", "resolved", "status", "total", "upcoming"]);
  });
});
