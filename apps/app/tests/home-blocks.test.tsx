import { screen, fireEvent } from "@testing-library/react-native";
import type { EntryDto, HomeDto } from "@medicron/shared";
import { renderApp } from "./helpers";

jest.mock("@/lib/home-queries", () => ({ useRecordDose: () => ({ mutateAsync: jest.fn() }) }));
jest.mock("@/components/ui/toast", () => ({ toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() }, Toaster: () => null }));
jest.mock("@/lib/clock", () => ({ now: () => new Date("2026-11-07T15:00:00.000Z") }));

import { StreakCard } from "@/components/home/streak-card";
import { AttentionList } from "@/components/home/attention-list";
import { DayTimeline } from "@/components/home/day-timeline";

const NOW = "2026-11-07T15:00:00.000Z";
const entry = (o: Partial<EntryDto> = {}): EntryDto => ({
  planId: "p1", scheduledFor: "2026-11-07T11:00:00.000Z", patientId: "a", patientName: "Izzy", itemName: "Dipirona",
  kind: "medication", dose: null, reschedule: false, state: "missed", resolvedBy: null, resolvedAt: null,
  late: false, value: null, note: null, ...o,
});

const week = (over: Partial<Record<string, HomeDto["week"][number]["status"]>> = {}): HomeDto["week"] =>
  ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"].map((key) => ({
    key, status: over[key] ?? (key === "2026-11-07" ? "open" : key > "2026-11-07" ? "future" : "ok"), isToday: key === "2026-11-07",
  }));

describe("StreakCard", () => {
  const props = { streak: { days: 3, atRisk: false, pendingKeys: [] }, week: week(), progress: { resolved: 2, total: 5 }, closedToday: false, riskCount: 0, onSelectDay: jest.fn() };

  test.each([[0, "Comece sua sequência: feche o dia de hoje"], [1, "1 dia em dia"], [5, "5 dias seguidos em dia"]])("%i dias → '%s'", async (days, title) => {
    await renderApp(<StreakCard {...props} streak={{ days, atRisk: false, pendingKeys: [] }} />);
    expect(screen.getByText(title)).toBeOnTheScreen();
  });

  test("faltam n para fechar hoje, e 'Dia fechado!' quando fechou", async () => {
    const { rerender } = await renderApp(<StreakCard {...props} />);
    expect(screen.getByText("Faltam 3 para fechar hoje")).toBeOnTheScreen();
    await rerender(<StreakCard {...props} closedToday />);
    expect(screen.getByText("Dia fechado!")).toBeOnTheScreen();
  });

  test("sem cuidados hoje (total 0) não mostra 'Faltam'", async () => {
    await renderApp(<StreakCard {...props} progress={{ resolved: 0, total: 0 }} />);
    expect(screen.queryByText(/Faltam/)).toBeNull();
  });

  test("aviso de risco no singular e no plural", async () => {
    const risk = { days: 3, atRisk: true, pendingKeys: ["2026-11-06"] };
    const { rerender } = await renderApp(<StreakCard {...props} streak={risk} riskCount={1} />);
    expect(screen.getByText("Ontem tem 1 dose sem registro: resolva até hoje 23:59 para manter a sequência")).toBeOnTheScreen();
    await rerender(<StreakCard {...props} streak={risk} riskCount={2} />);
    expect(screen.getByText("Ontem tem 2 doses sem registro: resolva até hoje 23:59 para manter a sequência")).toBeOnTheScreen();
  });

  test("sem risco não mostra o aviso", async () => {
    await renderApp(<StreakCard {...props} streak={{ days: 3, atRisk: true, pendingKeys: [] }} riskCount={0} />);
    expect(screen.queryByText(/sem registro/)).toBeNull();
  });

  test("células: rótulos acessíveis, dia futuro sem toque, toque seleciona o dia", async () => {
    const onSelectDay = jest.fn();
    await renderApp(<StreakCard {...props} week={week({ "2026-11-02": "lost", "2026-11-03": "pending" })} onSelectDay={onSelectDay} />);
    expect(screen.getByRole("button", { name: "sábado, 7: hoje, em andamento" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "segunda, 2: dose sem solução" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "terça, 3: pendente" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "quarta, 4: em dia" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /domingo, 8/ })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "segunda, 2: dose sem solução" }));
    expect(onSelectDay).toHaveBeenLastCalledWith("2026-11-02", false);
    await fireEvent.press(screen.getByRole("button", { name: "sábado, 7: hoje, em andamento" }));
    expect(onSelectDay).toHaveBeenLastCalledWith("2026-11-07", true);
  });

  test("anel de progresso com rótulo", async () => {
    await renderApp(<StreakCard {...props} />);
    expect(screen.getByLabelText("2 de 5 cuidados de hoje resolvidos")).toBeOnTheScreen();
  });
});

describe("AttentionList", () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => entry({ planId: `p${i}`, itemName: `Item ${i}` }));

  test("lista vazia não renderiza nada", async () => {
    await renderApp(<AttentionList entries={[]} now={NOW} />);
    expect(screen.queryByText(/Precisa de atenção/)).toBeNull();
  });

  test("mostra os 5 primeiros e 'Ver todas (7)' mostra os 7", async () => {
    await renderApp(<AttentionList entries={many(7)} now={NOW} />);
    expect(screen.getByRole("header", { name: "Precisa de atenção · 7" })).toBeOnTheScreen();
    expect(screen.getAllByRole("button", { name: "Feito" })).toHaveLength(5);
    await fireEvent.press(screen.getByRole("button", { name: "Ver todas (7)" }));
    expect(screen.getAllByRole("button", { name: "Feito" })).toHaveLength(7);
    expect(screen.queryByRole("button", { name: /Ver todas/ })).toBeNull();
  });

  test("até 5 não mostra o botão", async () => {
    await renderApp(<AttentionList entries={many(5)} now={NOW} />);
    expect(screen.queryByRole("button", { name: /Ver todas/ })).toBeNull();
  });

  test("tom e horário: 'agora' é Agora; atrasada de ontem mostra data e hora", async () => {
    await renderApp(
      <AttentionList now={NOW} entries={[
        entry({ planId: "a", state: "now", itemName: "Agora-item" }),
        entry({ planId: "b", state: "missed", scheduledFor: "2026-11-06T11:00:00.000Z", itemName: "Ontem-item" }),
      ]} />,
    );
    expect(screen.getByText("Agora")).toBeOnTheScreen();
    expect(screen.getByText("Atrasada")).toBeOnTheScreen();
    expect(screen.getByText("08:00")).toBeOnTheScreen();
    expect(screen.getByText("06/11 08:00")).toBeOnTheScreen();
    expect(screen.getByText("há 1 d")).toBeOnTheScreen();
    expect(screen.getByText("há 4 h")).toBeOnTheScreen();
  });
});

describe("DayTimeline", () => {
  const izzy = { patientId: "a", patientName: "Izzy", total: 3, resolved: 2, missed: 0, entries: [
    entry({ planId: "p1", state: "done", resolvedBy: "Ana", resolvedAt: "2026-11-07T11:05:00.000Z", dose: "1 cp", value: "38,7 °C", note: "ok", late: true, itemName: "Dipirona" }),
    entry({ planId: "p2", state: "now", itemName: "Soro", scheduledFor: "2026-11-07T14:00:00.000Z" }),
    entry({ planId: "p3", state: "later", itemName: "Banho", scheduledFor: "2026-11-07T20:00:00.000Z" }),
  ] };
  const bob = { patientId: "b", patientName: "Bob", total: 1, resolved: 0, missed: 2, entries: [entry({ planId: "q1", patientId: "b", patientName: "Bob", state: "missed", itemName: "Vitamina" })] };
  const props = { patients: [izzy, bob], selectedKey: "2026-11-07", todayKey: "2026-11-07", selectedStatus: "open" as const, onBackToToday: jest.fn() };

  test("abas de pacientes com contador x/y ou de pendentes; a primeira vem selecionada", async () => {
    await renderApp(<DayTimeline {...props} />);
    expect(screen.getByRole("tab", { name: /Izzy.*2\/3/ })).toBeSelected();
    expect(screen.getByRole("tab", { name: /Bob.*2/ })).not.toBeSelected();
    expect(screen.getByText("Dipirona")).toBeOnTheScreen();
    expect(screen.queryByText("Vitamina")).toBeNull();
    await fireEvent.press(screen.getByRole("tab", { name: /Bob/ }));
    expect(screen.getByRole("tab", { name: /Bob/ })).toBeSelected();
    expect(screen.getByText("Vitamina")).toBeOnTheScreen();
    expect(screen.queryByText("Dipirona")).toBeNull();
  });

  test("entrada feita: horário, dose · valor, selo, quem · hora, 'registrada depois' e observação", async () => {
    await renderApp(<DayTimeline {...props} />);
    expect(screen.getByText("08:00")).toBeOnTheScreen();
    expect(screen.getByText("1 cp · 38,7 °C")).toBeOnTheScreen();
    expect(screen.getAllByText("Feito")).toHaveLength(2); // o selo da dose feita e o botão da dose "agora"
    expect(screen.getByText("Ana · 08:05")).toBeOnTheScreen();
    expect(screen.getByText("registrada depois")).toBeOnTheScreen();
    expect(screen.getByText("“ok”")).toBeOnTheScreen();
  });

  test("selos de estado e botões só em 'agora' e 'sem registro'", async () => {
    await renderApp(<DayTimeline {...props} />);
    expect(screen.getByText("Agora")).toBeOnTheScreen();
    expect(screen.getByText("Mais tarde")).toBeOnTheScreen();
    expect(screen.getAllByRole("button", { name: "Feito" })).toHaveLength(1); // só o "Soro" (agora)
    await fireEvent.press(screen.getByRole("tab", { name: /Bob/ }));
    expect(screen.getByText("Sem registro")).toBeOnTheScreen();
    expect(screen.getAllByRole("button", { name: "Feito" })).toHaveLength(1);
  });

  test("sem pacientes no dia: estado vazio", async () => {
    await renderApp(<DayTimeline {...props} patients={[]} />);
    expect(screen.getByText("Nenhum cuidado neste dia")).toBeOnTheScreen();
    expect(screen.getByText("Quando houver cuidados esperados, eles aparecem aqui.")).toBeOnTheScreen();
  });

  test("dia passado: 'Dia 03/11', situação e 'Voltar para hoje'", async () => {
    const onBackToToday = jest.fn();
    const { rerender } = await renderApp(<DayTimeline {...props} selectedKey="2026-11-03" selectedStatus="lost" onBackToToday={onBackToToday} />);
    expect(screen.getByText("Dia 03/11")).toBeOnTheScreen();
    expect(screen.getByText("Dose sem solução")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Voltar para hoje" }));
    expect(onBackToToday).toHaveBeenCalledTimes(1);
    await rerender(<DayTimeline {...props} selectedKey="2026-11-03" selectedStatus="ok" />);
    expect(screen.getByText("Em dia", { exact: false })).toBeOnTheScreen();
  });

  test("hoje: sem 'Voltar para hoje'", async () => {
    await renderApp(<DayTimeline {...props} />);
    expect(screen.queryByRole("link", { name: "Voltar para hoje" })).toBeNull();
  });
});
