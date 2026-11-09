import { formatTime, parseLocalInput, toLocalInput, type EntryDto, type HomeDto } from "@medicron/shared";

/**
 * Próxima dose no widget: `time` "08:00" (texto), `at` o instante exato em ms (o widget deixa o sistema calcular
 * "em 3 h", que se atualiza sozinho sem gastar o limite de atualizações do iOS).
 * Só valores simples, NUNCA `null` nem `Date`: o módulo nativo grava as props no UserDefaults do App Group.
 */
export type WidgetItem = { time: string; item: string; patient: string; at: number };

/** Tudo que o widget mostra: o widget não tem rede nem lógica, o app entrega pronto. */
export type WidgetProps = {
  status: "ok" | "empty" | "stale" | "signedOut"; // stale = o dia do dado já passou (pede para abrir o app)
  resolved: number; // doses de hoje já feitas (anel do dia)
  total: number; // doses de hoje
  upcoming: WidgetItem[]; // as 2 próximas, em ordem
  pendingCount: number; // "agora" (janela de ±15 min) e atrasadas
  pendingSince: string; // horário da pendente mais antiga ("06:00", "ontem 20:00") ou ""
};

const WINDOW_MS = 15 * 60_000; // a mesma janela "agora" do servidor (EARLY_WINDOW_MS)
const MAX_ENTRIES = 24; // inclui a primeira (agora) e a última (meia-noite, "stale")
const SHOW_UPCOMING = 2;
const MAX_ITEM = 28;
const MAX_PATIENT = 20;

const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function signedOutProps(): WidgetProps {
  return { status: "signedOut", resolved: 0, total: 0, upcoming: [], pendingCount: 0, pendingSince: "" };
}

type Slot = { at: number; date: Date; item: string; patient: string };

function toSlot(e: EntryDto): Slot {
  const date = new Date(e.scheduledFor);
  return { at: date.getTime(), date, item: cut(e.itemName, MAX_ITEM), patient: cut(e.patientName, MAX_PATIENT) };
}

/**
 * Entradas da timeline do widget a partir da tela Hoje: uma agora e uma a cada mudança de estado até o fim do dia
 * (a dose entra na janela "agora" 15 min antes e vira atrasada 15 min depois), então o widget avança sozinho entre
 * aberturas do app. À meia-noite de Brasília a última entrada vira "stale". `null` = sem sessão.
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

  const todayKey = home.todayKey;
  const label = (s: Slot) => {
    const time = formatTime(s.date);
    return toLocalInput(s.date).slice(0, 10) < todayKey ? `ontem ${time}` : time;
  };
  const { resolved, total } = home.progress;

  const propsAt = (t: number): WidgetProps => {
    const upcoming: Slot[] = [];
    const pending: Slot[] = [];
    for (const s of slots) {
      // No instante exato dose+15min o widget já conta como atrasada (o servidor só depois): é a fronteira da entrada.
      if (s.at - t <= WINDOW_MS) pending.push(s);
      else upcoming.push(s);
    }
    upcoming.sort((a, b) => a.at - b.at);
    pending.sort((a, b) => a.at - b.at);
    const empty = slots.length === 0 && total === 0;
    return {
      status: empty ? "empty" : "ok",
      resolved,
      total,
      upcoming: upcoming.slice(0, SHOW_UPCOMING).map((s) => ({ time: label(s), item: s.item, patient: s.patient, at: s.at })),
      pendingCount: pending.length,
      pendingSince: pending[0] ? label(pending[0]) : "",
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
  return [...live, { date: new Date(endOfDay + 1_000), props: { ...signedOutProps(), status: "stale" as const } }];
}
