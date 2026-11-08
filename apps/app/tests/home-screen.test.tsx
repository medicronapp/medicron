import { act, fireEvent, screen } from "@testing-library/react-native";
import type { EntryDto, HomeDto, OnboardingDto } from "@medicron/shared";
import { renderApp } from "./helpers";

const mockRouter = { push: jest.fn(), replace: jest.fn(), setParams: jest.fn() };
const mockParams: { value: Record<string, string> } = { value: {} };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => mockParams.value }));

type Q = { data?: unknown; isPending: boolean; isError: boolean; isRefetching: boolean; refetch: jest.Mock };
const mockQuery: { value: Q } = { value: { isPending: true, isError: false, isRefetching: false, refetch: jest.fn() } };
const mockUseHome = jest.fn((_dia?: string) => mockQuery.value);
jest.mock("@/lib/home-queries", () => ({
  useHome: (dia?: string) => mockUseHome(dia),
  useRecordDose: () => ({ mutateAsync: jest.fn() }),
  useCompleteWelcome: () => ({ mutate: jest.fn() }),
  useDismissChecklist: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/components/ui/toast", () => ({ toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() }, Toaster: () => null }));
jest.mock("@/lib/clock", () => ({ now: () => new Date("2026-11-07T15:00:00.000Z") }));

import Hoje from "@/app/(app)/index";

const NOW = "2026-11-07T15:00:00.000Z";
const entry = (o: Partial<EntryDto> = {}): EntryDto => ({
  planId: "p1", scheduledFor: "2026-11-06T11:00:00.000Z", patientId: "a", patientName: "Izzy", itemName: "Dipirona",
  kind: "medication", dose: null, reschedule: false, state: "missed", resolvedBy: null, resolvedAt: null,
  late: false, value: null, note: null, ...o,
});
const home = (o: Partial<HomeDto> = {}): HomeDto => ({
  now: NOW, todayKey: "2026-11-07", selectedKey: "2026-11-07", selectedStatus: "open",
  streak: { days: 2, atRisk: true, pendingKeys: ["2026-11-06"] },
  week: ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"].map((key) => ({
    key, status: key === "2026-11-07" ? ("open" as const) : key > "2026-11-07" ? ("future" as const) : ("ok" as const), isToday: key === "2026-11-07",
  })),
  progress: { resolved: 1, total: 3 }, closedToday: false,
  attention: [entry()],
  patients: [{ patientId: "a", patientName: "Izzy", total: 3, resolved: 1, missed: 1, entries: [entry({ state: "now", scheduledFor: "2026-11-07T14:00:00.000Z" })] }],
  ...o,
});
const onboarding = (o: Partial<OnboardingDto> = {}): OnboardingDto => ({
  showWelcome: false, checklist: { show: false, steps: { patient: true, item: true, plan: true, push: true } }, ...o,
});
const ready = (h: HomeDto, hasPatients = true, ob = onboarding()) => {
  mockQuery.value = { data: { home: h, hasPatients, onboarding: ob }, isPending: false, isError: false, isRefetching: false, refetch: jest.fn() };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.value = {};
  mockQuery.value = { isPending: true, isError: false, isRefetching: false, refetch: jest.fn() };
});

describe("estados", () => {
  test("carregando mostra o esqueleto", async () => {
    await renderApp(<Hoje />);
    expect(screen.getByLabelText("Carregando")).toBeOnTheScreen();
  });

  test("erro mostra a tela de erro e 'Tentar de novo' refaz a consulta", async () => {
    mockQuery.value = { isPending: false, isError: true, isRefetching: false, refetch: jest.fn() };
    await renderApp(<Hoje />);
    expect(screen.getByRole("header", { name: "Algo deu errado" })).toBeOnTheScreen();
    expect(screen.getByText("Não foi possível carregar esta tela. Tente novamente em instantes.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(mockQuery.value.refetch).toHaveBeenCalledTimes(1);
  });

  test("sem pacientes: vazio com 'Cadastrar paciente'", async () => {
    ready(home(), false);
    await renderApp(<Hoje />);
    expect(screen.getByText("Comece cadastrando seu primeiro paciente")).toBeOnTheScreen();
    expect(screen.getByText("Depois é só cadastrar as medicações e montar a rotina de cada um.")).toBeOnTheScreen();
    expect(screen.queryByText(/Linha do dia/)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Cadastrar paciente" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/pacientes/novo");
  });
});

describe("com pacientes", () => {
  test("título 'Hoje' com a data longa e os blocos na ordem do site", async () => {
    ready(home());
    await renderApp(<Hoje />);
    expect(screen.getByRole("header", { name: "Hoje" })).toBeOnTheScreen();
    expect(screen.getByText("sábado, 7 de novembro")).toBeOnTheScreen();
    const order = screen
      .getAllByText(/sábado, 7|dias seguidos em dia|Precisa de atenção|Linha do dia/)
      .map((el) => [el.props.children].flat().join(""));
    expect(order).toEqual(["sábado, 7 de novembro", "2 dias seguidos em dia", "Precisa de atenção · 1", "Linha do dia"]);
  });

  test("aviso de risco usa as entradas de atenção de dias pendentes", async () => {
    ready(home());
    await renderApp(<Hoje />);
    expect(screen.getByText("Ontem tem 1 dose sem registro: resolva até hoje 23:59 para manter a sequência")).toBeOnTheScreen();
  });

  test("boas-vindas e primeiros passos aparecem conforme o onboarding", async () => {
    ready(home(), true, onboarding({ showWelcome: true, checklist: { show: true, steps: { patient: true, item: false, plan: false, push: false } } }));
    await renderApp(<Hoje />);
    expect(await screen.findByText("Bem-vindo ao Medicron")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Primeiros passos" })).toBeOnTheScreen();
  });

  test("passo do checklist navega", async () => {
    ready(home(), true, onboarding({ checklist: { show: true, steps: { patient: true, item: false, plan: false, push: false } } }));
    await renderApp(<Hoje />);
    await fireEvent.press(screen.getByRole("link", { name: "Cadastrar uma medicação ou procedimento" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/itens/novo");
  });
});

describe("dia selecionado (?dia=)", () => {
  test("a rota passa o dia à consulta", async () => {
    mockParams.value = { dia: "2026-11-03" };
    await renderApp(<Hoje />);
    expect(mockUseHome).toHaveBeenCalledWith("2026-11-03");
  });

  test("sem parâmetro consulta hoje", async () => {
    await renderApp(<Hoje />);
    expect(mockUseHome).toHaveBeenCalledWith(undefined);
  });

  test("tocar num dia da semana põe o dia na rota; tocar em hoje tira", async () => {
    ready(home());
    await renderApp(<Hoje />);
    await fireEvent.press(screen.getByRole("button", { name: "terça, 3: em dia" }));
    expect(mockRouter.setParams).toHaveBeenLastCalledWith({ dia: "2026-11-03" });
    await fireEvent.press(screen.getByRole("button", { name: "sábado, 7: hoje, em andamento" }));
    expect(mockRouter.setParams).toHaveBeenLastCalledWith({ dia: undefined });
  });

  test("dia passado mostra 'Voltar para hoje', que limpa o parâmetro", async () => {
    mockParams.value = { dia: "2026-11-03" };
    ready(home({ selectedKey: "2026-11-03", selectedStatus: "lost" }));
    await renderApp(<Hoje />);
    expect(screen.getByText("Dia 03/11")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Voltar para hoje" }));
    expect(mockRouter.setParams).toHaveBeenLastCalledWith({ dia: undefined });
  });

  test("dia inválido: a API devolve hoje e a tela mostra hoje, sem 'Voltar para hoje'", async () => {
    mockParams.value = { dia: "2026-02-31" };
    ready(home());
    await renderApp(<Hoje />);
    expect(mockUseHome).toHaveBeenCalledWith("2026-02-31");
    expect(screen.queryByRole("link", { name: "Voltar para hoje" })).toBeNull();
  });
});

test("puxar para atualizar refaz a consulta", async () => {
  ready(home());
  await renderApp(<Hoje />);
  const scroll = screen.getByTestId("home-scroll");
  await act(async () => { scroll.props.refreshControl.props.onRefresh(); });
  expect(mockQuery.value.refetch).toHaveBeenCalledTimes(1);
});
