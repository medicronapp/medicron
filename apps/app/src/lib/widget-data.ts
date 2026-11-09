import { formatTime, parseLocalInput, toLocalInput, type EntryDto, type HomeDto } from "@medicron/shared";

/** Linha do widget: horário "08:00" (ou "ontem 20:00"), remédio, paciente e dose. `late` = atrasada (não só "agora"). */
export type WidgetItem = { time: string; item: string; patient: string; dose: string | null; late: boolean };

/** Tudo que o widget mostra: o widget não tem rede nem lógica, o app entrega pronto. */
export type WidgetProps = {
  status: "ok" | "empty" | "stale" | "signedOut"; // stale = o dia do dado já passou (pede para abrir o app)
  upcoming: WidgetItem[];
  pending: WidgetItem[];
  upcomingCount: number;
  pendingCount: number;
  updatedAt: string;
};

const WINDOW_MS = 15 * 60_000; // a mesma janela "agora" do servidor (EARLY_WINDOW_MS)
const MAX_ENTRIES = 24; // inclui a primeira (agora) e a última (meia-noite, "stale")
const SHOW_UPCOMING = 3;
const SHOW_PENDING = 2;
const MAX_ITEM = 28;
const MAX_PATIENT = 20;

const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function signedOutProps(): WidgetProps {
  return { status: "signedOut", upcoming: [], pending: [], upcomingCount: 0, pendingCount: 0, updatedAt: "" };
}

type Slot = { at: number; date: Date; item: string; patient: string; dose: string | null };

function toSlot(e: EntryDto): Slot {
  const date = new Date(e.scheduledFor);
  return { at: date.getTime(), date, item: cut(e.itemName, MAX_ITEM), patient: cut(e.patientName, MAX_PATIENT), dose: e.dose };
}

/**
 * Entradas da timeline do widget a partir da tela Hoje: uma agora e uma a cada mudança de estado até o fim do dia
 * (a dose entra na janela "agora" 15 min antes e vira atrasada 15 min depois), então o widget avança sozinho entre
 * aberturas do app. `null` = sem sessão.
 */
export function buildWidgetTimeline(now: Date, home: HomeDto | null): { date: Date; props: WidgetProps }[] {
  if (!home) return [{ date: now, props: signedOutProps() }];

  const unresolved = new Set(["later", "now", "missed"]);
  const seen = new Set<string>();
  const slots: Slot[] = [];
  for (const e of [...home.attention, ...home.patients.flatMap((p) => p.entries)]) {
    const key = `${e.planId}|${e.scheduledFor}`;
    if (seen.has(key) || !unresolved.has(e.state)) continue;
    seen.add(key);
    slots.push(toSlot(e));
  }

  const updatedAt = formatTime(now);
  const todayKey = home.todayKey;
  const label = (s: Slot) => {
    const time = formatTime(s.date);
    return toLocalInput(s.date).slice(0, 10) < todayKey ? `ontem ${time}` : time;
  };
  const item = (s: Slot, late: boolean): WidgetItem => ({ time: label(s), item: s.item, patient: s.patient, dose: s.dose, late });

  const propsAt = (t: number): WidgetProps => {
    const upcoming: Slot[] = [];
    const pending: { s: Slot; late: boolean }[] = [];
    for (const s of slots) {
      const diff = s.at - t;
      // No instante exato dose+15min o widget já conta como atrasada (o servidor só depois): é a fronteira da entrada.
      if (diff <= -WINDOW_MS) pending.push({ s, late: true });
      else if (diff <= WINDOW_MS) pending.push({ s, late: false });
      else upcoming.push(s);
    }
    upcoming.sort((a, b) => a.at - b.at);
    pending.sort((a, b) => b.s.at - a.s.at);
    const empty = slots.length === 0 && home.progress.total === 0;
    return {
      status: empty ? "empty" : "ok",
      upcoming: upcoming.slice(0, SHOW_UPCOMING).map((s) => item(s, false)),
      pending: pending.slice(0, SHOW_PENDING).map((p) => item(p.s, p.late)),
      upcomingCount: upcoming.length,
      pendingCount: pending.length,
      updatedAt,
    };
  };

  const endOfDay = parseLocalInput(`${todayKey}T23:59`).getTime() + 59_000;
  const instants = new Set<number>();
  for (const s of slots) {
    for (const t of [s.at - WINDOW_MS, s.at + WINDOW_MS]) if (t > now.getTime() && t <= endOfDay) instants.add(t);
  }
  const later = [...instants].sort((a, b) => a - b).slice(0, MAX_ENTRIES - 2);
  const live = [now.getTime(), ...later].map((t) => ({ date: new Date(t), props: propsAt(t) }));
  // À meia-noite de Brasília os horários e "ontem" deixam de valer: o widget para de afirmar o dia anterior.
  const midnight = new Date(endOfDay + 1_000);
  return [...live, { date: midnight, props: { ...signedOutProps(), status: "stale" as const, updatedAt } }];
}
