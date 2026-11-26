import { fireEvent, screen, waitFor, within } from "@testing-library/react-native";
import type { PatientDto, PlanDto } from "@medicron/shared";
import { renderApp } from "./helpers";
import { ApiClientError } from "@/lib/api/errors";

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), dismissTo: jest.fn(), back: jest.fn(), setParams: jest.fn() };
const mockParams: { value: Record<string, string> } = { value: { id: "a" } };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => mockParams.value, Stack: () => null }));
jest.mock("@/lib/clock", () => ({ now: () => new Date("2026-11-08T15:00:00.000Z") })); // 12:00 em Brasília
jest.mock("@/components/ui/toast", () => ({ toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() }, Toaster: () => null }));

const mockPick = { y: 2026, mo: 12, d: 1, h: 10, mi: 0 };
jest.mock("@react-native-community/datetimepicker", () => {
  const { Pressable } = require("react-native");
  return {
    __esModule: true,
    default: (p: { mode: string; onChange: (e: unknown, d: Date) => void }) => (
      <Pressable testID={`picker-${p.mode}`} onPress={() => p.onChange({ type: "set" }, new Date(mockPick.y, mockPick.mo - 1, mockPick.d, mockPick.h, mockPick.mi))} />
    ),
    DateTimePickerAndroid: { open: jest.fn() },
  };
});

type Q<T> = { data?: T; isPending: boolean; isError: boolean; error?: unknown; isRefetching: boolean; refetch: jest.Mock };
const mockPatient: { value: Q<PatientDto> } = { value: { isPending: true, isError: false, isRefetching: false, refetch: jest.fn() } };
const mockPlans: { value: Q<PlanDto[]> } = { value: { isPending: false, isError: false, data: [], isRefetching: false, refetch: jest.fn() } };
const mockUpdatePatient = jest.fn();
const mockArchive = jest.fn();
const mockNotify = jest.fn();
const mockPause = jest.fn();
const mockResume = jest.fn();
const mockUpdatePlan = jest.fn();
const mockDeactivate = jest.fn();
jest.mock("@/lib/patient-queries", () => ({
  usePatient: () => mockPatient.value,
  usePlans: () => mockPlans.value,
  useUpdatePatient: () => ({ mutateAsync: (a: unknown) => mockUpdatePatient(a) }),
  useArchivePatient: () => ({ mutateAsync: (a: unknown) => mockArchive(a) }),
  useSetPatientNotifications: () => ({ mutateAsync: (a: unknown) => mockNotify(a) }),
  usePausePatient: () => ({ mutateAsync: (a: unknown) => mockPause(a) }),
  useResumePatient: () => ({ mutateAsync: (a: unknown) => mockResume(a) }),
  useUpdatePlan: () => ({ mutateAsync: (a: unknown) => mockUpdatePlan(a) }),
  useDeactivatePlan: () => ({ mutateAsync: (a: unknown) => mockDeactivate(a) }),
}));

import { toast as mockToast } from "@/components/ui/toast";
import Detalhe from "@/app/(app)/pacientes/[id]/index";

const patient = (o: Partial<PatientDto> = {}): PatientDto => ({
  id: "a", name: "Izzy", species: "cat", birthDate: null, weightKg: null, notes: null, pausedAt: null, notify: true, createdAt: "2026-01-01T00:00:00.000Z", ...o,
});
const plan = (o: Partial<PlanDto> = {}): PlanDto => ({
  id: "p1", patientId: "a", itemId: "i1", item: { id: "i1", name: "Dipirona", kind: "medication", defaultDose: null, notes: null, createdAt: "2026-01-01T00:00:00.000Z" },
  dose: "1 comprimido", intervalMinutes: 480, anchorAt: "2026-11-08T11:00:00.000Z", endAt: null, active: true, reschedule: false,
  nextDueAt: "2026-11-08T19:00:00.000Z", createdAt: "2026-01-01T00:00:00.000Z", ...o,
});
const ready = (p = patient(), plans: PlanDto[] = []) => {
  mockPatient.value = { data: p, isPending: false, isError: false, isRefetching: false, refetch: jest.fn() };
  mockPlans.value = { data: plans, isPending: false, isError: false, isRefetching: false, refetch: jest.fn() };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.value = { id: "a" };
  Object.assign(mockPick, { y: 2026, mo: 12, d: 1, h: 10, mi: 0 });
  mockPatient.value = { isPending: true, isError: false, isRefetching: false, refetch: jest.fn() };
});

describe("cabeçalho e abas", () => {
  test("nome, espécie por extenso, voltar à lista e aba Rotina por padrão", async () => {
    ready();
    await renderApp(<Detalhe />);
    expect(screen.getByRole("header", { name: "Izzy" })).toBeOnTheScreen();
    expect(screen.getByText("Gato")).toBeOnTheScreen();
    expect(screen.getByRole("tab", { name: "Rotina" })).toBeSelected();
    await fireEvent.press(screen.getByRole("button", { name: "Voltar" }));
    expect(mockRouter.dismissTo).toHaveBeenCalledWith("/pacientes");
  });

  test("trocar de aba muda o parâmetro; aba=dados abre Dados", async () => {
    ready();
    const { unmount } = await renderApp(<Detalhe />);
    await fireEvent.press(screen.getByRole("tab", { name: "Dados" }));
    expect(mockRouter.setParams).toHaveBeenCalledWith({ aba: "dados" });
    await unmount();
    mockParams.value = { id: "a", aba: "dados" };
    await renderApp(<Detalhe />);
    expect(screen.getByRole("tab", { name: "Dados" })).toBeSelected();
    expect(screen.getByRole("button", { name: "Arquivar paciente" })).toBeOnTheScreen();
  });

  test("carregando mostra o esqueleto; 404 mostra 'Paciente não encontrado'", async () => {
    const { unmount } = await renderApp(<Detalhe />);
    expect(screen.getByLabelText("Carregando")).toBeOnTheScreen();
    await unmount();
    mockPatient.value = { isPending: false, isError: true, error: new ApiClientError(404, "not_found", "x"), isRefetching: false, refetch: jest.fn() };
    await renderApp(<Detalhe />);
    expect(screen.getByText("Paciente não encontrado")).toBeOnTheScreen();
    expect(screen.getByText("Ele pode ter sido arquivado.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Ver pacientes" }));
    expect(mockRouter.dismissTo).toHaveBeenCalledWith("/pacientes");
  });

  test("outro erro mostra a tela de erro com 'Tentar de novo'", async () => {
    mockPatient.value = { isPending: false, isError: true, error: new ApiClientError(500, "x", "x"), isRefetching: false, refetch: jest.fn() };
    await renderApp(<Detalhe />);
    await fireEvent.press(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(mockPatient.value.refetch).toHaveBeenCalled();
  });
});

describe("aba Rotina", () => {
  test("sem rotinas: vazio com 'Adicionar'", async () => {
    ready();
    await renderApp(<Detalhe />);
    expect(screen.getByText("Sem rotina ainda")).toBeOnTheScreen();
    expect(screen.getByText("Associe uma medicação ou procedimento e defina a frequência.")).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole("button", { name: "Adicionar" })[0]);
    expect(mockRouter.push).toHaveBeenCalledWith("/pacientes/a/rotina/nova");
  });

  test("falha ao carregar as rotinas mostra erro com 'Tentar de novo', e não o vazio que convida a criar outra", async () => {
    ready(patient(), []);
    mockPlans.value = { data: undefined, isPending: false, isError: true, isRefetching: false, refetch: jest.fn() };
    await renderApp(<Detalhe />);
    expect(screen.queryByText("Sem rotina ainda")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(mockPlans.value.refetch).toHaveBeenCalledTimes(1);
  });

  test("lista a rotina com dose, frequência e a próxima dose", async () => {
    ready(patient(), [plan()]);
    await renderApp(<Detalhe />);
    expect(screen.getByText("Dipirona")).toBeOnTheScreen();
    expect(screen.getByText("1 comprimido")).toBeOnTheScreen();
    expect(screen.getByText("A cada 8 horas")).toBeOnTheScreen();
    expect(screen.getByText("próxima 08/11 16:00")).toBeOnTheScreen(); // 11:00Z=08:00; +8h = 16:00 (Brasília); agora 12:00
    expect(screen.getByRole("button", { name: "Editar" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Encerrar" })).toBeOnTheScreen();
  });

  test("encerrar pede confirmação e desativa a rotina (uma vez)", async () => {
    mockDeactivate.mockResolvedValue(undefined);
    ready(patient(), [plan()]);
    await renderApp(<Detalhe />);
    await fireEvent.press(screen.getByRole("button", { name: "Encerrar" }));
    expect(await screen.findByText("Encerrar Dipirona?")).toBeOnTheScreen();
    expect(screen.getByText("Os lembretes de Dipirona para Izzy serão interrompidos. O histórico é mantido.")).toBeOnTheScreen();
    const b = screen.getByRole("button", { name: "Encerrar rotina" });
    await fireEvent.press(b);
    await fireEvent.press(b);
    await waitFor(() => expect(mockDeactivate).toHaveBeenCalledWith("p1"));
    expect(mockDeactivate).toHaveBeenCalledTimes(1);
  });
});

describe("editar rotina", () => {
  const open = async () => {
    await fireEvent.press(screen.getByRole("button", { name: "Editar" }));
    await screen.findByText("Izzy · editar rotina");
  };
  const tap = (name: string) => fireEvent.press(screen.getByRole("button", { name }));
  const save = () => fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
  const bodyOf = () => (mockUpdatePlan.mock.calls[0][0] as { body: Record<string, unknown> }).body;

  test("mostra os valores atuais: frequência, data final (relógio de Brasília), dose e ajuste", async () => {
    ready(patient(), [plan({ dose: "2 gotas", endAt: "2026-12-01T13:00:00.000Z", reschedule: true })]);
    await renderApp(<Detalhe />);
    await open();
    expect(screen.getByLabelText("Dose / instrução").props.value).toBe("2 gotas");
    expect(screen.getByRole("switch", { name: "Ajustar se eu atrasar" })).toBeChecked();
    expect(screen.getByText("Se uma dose atrasar, as próximas acompanham a hora real em que você aplicou.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "3x ao dia" })).toBeSelected();
    expect(screen.getByRole("button", { name: "Até uma data…" })).toBeSelected();
    expect(screen.getByText(/seguem o horário da primeira dose/)).toBeOnTheScreen();
  });

  test("salvar envia dose, data final (Brasília → UTC) e ajuste; avisa e fecha", async () => {
    mockUpdatePlan.mockResolvedValue(plan());
    ready(patient(), [plan()]);
    await renderApp(<Detalhe />);
    await open();
    await fireEvent.changeText(screen.getByLabelText("Dose / instrução"), " 2 gotas ");
    await tap("Até uma data…");
    await fireEvent.press(screen.getByTestId("picker-date")); // 2026-12-01: vale até o fim desse dia
    await fireEvent(screen.getByRole("switch", { name: "Ajustar se eu atrasar" }), "valueChange", true);
    await save();
    await waitFor(() => expect(mockUpdatePlan).toHaveBeenCalledWith({ planId: "p1", body: { dose: "2 gotas", endAt: "2026-12-02T02:59:00.000Z", reschedule: true } }));
    expect(mockToast.success).toHaveBeenCalledWith("Rotina atualizada");
    await waitFor(() => expect(screen.queryByText("Izzy · editar rotina")).toBeNull());
  });

  test("sem mexer na data final, ela volta igualzinha (hora incluída)", async () => {
    mockUpdatePlan.mockResolvedValue(plan());
    ready(patient(), [plan({ endAt: "2026-12-01T13:00:00.000Z" })]);
    await renderApp(<Detalhe />);
    await open();
    await save();
    await waitFor(() => expect(mockUpdatePlan).toHaveBeenCalled());
    expect(bodyOf()).toEqual({ dose: "1 comprimido", endAt: "2026-12-01T13:00:00.000Z", reschedule: false });
  });

  test("dose em branco e 'Contínuo' vão como null", async () => {
    mockUpdatePlan.mockResolvedValue(plan());
    ready(patient(), [plan({ dose: "x", endAt: "2026-12-01T13:00:00.000Z" })]);
    await renderApp(<Detalhe />);
    await open();
    await fireEvent.changeText(screen.getByLabelText("Dose / instrução"), "   ");
    await tap("Contínuo");
    await save();
    await waitFor(() => expect(mockUpdatePlan).toHaveBeenCalledWith({ planId: "p1", body: { dose: null, endAt: null, reschedule: false } }));
  });

  test("'7 dias' vale a partir de hoje, até o fim do 7º dia", async () => {
    mockUpdatePlan.mockResolvedValue(plan());
    ready(patient(), [plan()]);
    await renderApp(<Detalhe />);
    await open();
    await tap("7 dias");
    await save();
    await waitFor(() => expect(mockUpdatePlan).toHaveBeenCalled());
    expect(bodyOf().endAt).toBe("2026-11-15T02:59:00.000Z"); // 14/11 23:59 em Brasília
  });

  test("data final que bate com um atalho abre já marcada nele", async () => {
    ready(patient(), [plan({ endAt: "2026-11-15T02:59:00.000Z" })]);
    await renderApp(<Detalhe />);
    await open();
    expect(screen.getByRole("button", { name: "7 dias" })).toBeSelected();
  });

  test("422 de data final mostra a mensagem do servidor e mantém o sheet e o que foi digitado", async () => {
    mockUpdatePlan.mockRejectedValue(new ApiClientError(422, "end_before_next_dose", "A data final é anterior à próxima dose"));
    ready(patient(), [plan()]);
    await renderApp(<Detalhe />);
    await open();
    await fireEvent.changeText(screen.getByLabelText("Dose / instrução"), "3 gotas");
    await save();
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("A data final é anterior à próxima dose"));
    expect(screen.getByText("Izzy · editar rotina")).toBeOnTheScreen();
    expect(screen.getByLabelText("Dose / instrução").props.value).toBe("3 gotas");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
  });

  test("trocar a frequência (ex.: de 1 vez ao dia para a cada 4 horas) envia o novo intervalo junto do resto", async () => {
    mockUpdatePlan.mockResolvedValue(plan());
    ready(patient(), [plan({ intervalMinutes: 1440 })]);
    await renderApp(<Detalhe />);
    await open();
    expect(screen.getByRole("button", { name: "1x ao dia" })).toBeSelected();
    await tap("A cada 4 h");
    await save();
    await waitFor(() => expect(mockUpdatePlan).toHaveBeenCalledWith({ planId: "p1", body: { intervalMinutes: 240, dose: "1 comprimido", endAt: null, reschedule: false } }));
    expect(mockToast.success).toHaveBeenCalledWith("Rotina atualizada");
  });

  test("sem mexer na frequência ela não vai no corpo (nada de refazer os horários à toa)", async () => {
    mockUpdatePlan.mockResolvedValue(plan());
    ready(patient(), [plan({ intervalMinutes: 480 })]);
    await renderApp(<Detalhe />);
    await open();
    await save();
    await waitFor(() => expect(mockUpdatePlan).toHaveBeenCalled());
    expect(bodyOf()).not.toHaveProperty("intervalMinutes");
  });

  test("a prévia mostra as próximas doses e acompanha a nova frequência (grade do primeiro horário, 08:00)", async () => {
    ready(patient(), [plan({ intervalMinutes: 480 })]); // agora 12:00; grade 08:00, 16:00, 00:00…
    await renderApp(<Detalhe />);
    await open();
    expect(screen.getByText("Dipirona, a cada 8 horas, uso contínuo")).toBeOnTheScreen();
    expect(within(screen.getByLabelText("Próximas doses")).getAllByText("16:00")).toHaveLength(2);
    await tap("A cada 4 h");
    expect(screen.getByText("Dipirona, a cada 4 horas, uso contínuo")).toBeOnTheScreen();
    const doses = screen.getByLabelText("Próximas doses");
    for (const t of ["16:00", "20:00", "00:00", "04:00", "08:00"]) expect(within(doses).getByText(t)).toBeOnTheScreen();
  });

  test("frequência fora dos atalhos abre em 'Outra…' com a quantidade; inválida avisa e não envia", async () => {
    mockUpdatePlan.mockResolvedValue(plan());
    ready(patient(), [plan({ intervalMinutes: 90 })]);
    await renderApp(<Detalhe />);
    await open();
    expect(screen.getByRole("button", { name: "Outra…" })).toBeSelected();
    expect(screen.getByLabelText("Quantidade").props.value).toBe("90");
    expect(screen.getByRole("tab", { name: "Minutos" })).toBeSelected();
    await fireEvent.changeText(screen.getByLabelText("Quantidade"), "2");
    await save();
    expect(await screen.findByText("Informe um intervalo entre 5 minutos e 1 ano")).toBeOnTheScreen();
    expect(mockUpdatePlan).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByLabelText("Quantidade"), "45");
    await save();
    await waitFor(() => expect(mockUpdatePlan).toHaveBeenCalled());
    expect(bodyOf().intervalMinutes).toBe(45);
  });

  test("Cancelar fecha sem salvar", async () => {
    ready(patient(), [plan()]);
    await renderApp(<Detalhe />);
    await open();
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));
    expect(mockUpdatePlan).not.toHaveBeenCalled();
  });
});

describe("aba Dados", () => {
  beforeEach(() => { mockParams.value = { id: "a", aba: "dados" }; });

  test("editar o paciente salva, avisa e fica na aba", async () => {
    mockUpdatePatient.mockResolvedValue(patient());
    ready();
    await renderApp(<Detalhe />);
    await fireEvent.changeText(screen.getByLabelText("Nome"), "Izzy Maria");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(mockUpdatePatient).toHaveBeenCalledWith({ id: "a", body: { name: "Izzy Maria", species: "cat" } }));
    expect(mockToast.success).toHaveBeenCalledWith("Salvo");
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });

  test("arquivar pede confirmação, executa uma vez e volta à lista", async () => {
    mockArchive.mockResolvedValue(undefined);
    ready();
    await renderApp(<Detalhe />);
    await fireEvent.press(screen.getByRole("button", { name: "Arquivar paciente" }));
    expect(await screen.findByText("Arquivar Izzy?")).toBeOnTheScreen();
    expect(screen.getByText("O paciente some das listas e todas as rotinas dele são encerradas.")).toBeOnTheScreen();
    const b = screen.getByRole("button", { name: "Arquivar" });
    await fireEvent.press(b);
    await fireEvent.press(b);
    await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith("/pacientes"));
    expect(mockArchive).toHaveBeenCalledTimes(1);
    expect(mockArchive).toHaveBeenCalledWith("a");
  });
});

describe("pausar e retomar o acompanhamento", () => {
  const PAUSED = "2026-11-01T12:00:00.000Z";

  test("ativo: em Dados há 'Pausar acompanhamento'; a confirmação explica e pausar avisa", async () => {
    mockPause.mockResolvedValue(undefined);
    mockParams.value = { id: "a", aba: "dados" };
    ready();
    await renderApp(<Detalhe />);
    expect(screen.queryByRole("button", { name: "Retomar acompanhamento" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Pausar acompanhamento" }));
    expect(await screen.findByText("Pausar o acompanhamento de Izzy?")).toBeOnTheScreen();
    expect(screen.getByText(/sem lembretes/i)).toBeOnTheScreen();
    expect(screen.getByText(/rotinas ficam guardadas/i)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Pausar" }));
    await waitFor(() => expect(mockPause).toHaveBeenCalledWith("a"));
    expect(mockToast.success).toHaveBeenCalledWith("Acompanhamento pausado");
  });

  test("cancelar a confirmação não pausa", async () => {
    mockParams.value = { id: "a", aba: "dados" };
    ready();
    await renderApp(<Detalhe />);
    await fireEvent.press(screen.getByRole("button", { name: "Pausar acompanhamento" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Cancelar" }));
    expect(mockPause).not.toHaveBeenCalled();
  });

  test("pausado: aviso no topo (nas duas abas) com 'Retomar acompanhamento' e sem o botão de pausar", async () => {
    ready(patient({ pausedAt: PAUSED }));
    await renderApp(<Detalhe />);
    expect(screen.getByText("Acompanhamento pausado. Sem lembretes até você retomar.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Retomar acompanhamento" })).toBeOnTheScreen();
    mockParams.value = { id: "a", aba: "dados" };
    await renderApp(<Detalhe />);
    expect(screen.queryByRole("button", { name: "Pausar acompanhamento" })).toBeNull();
  });

  test("retomar chama a API e avisa", async () => {
    mockResume.mockResolvedValue(undefined);
    ready(patient({ pausedAt: PAUSED }));
    await renderApp(<Detalhe />);
    await fireEvent.press(screen.getByRole("button", { name: "Retomar acompanhamento" }));
    await waitFor(() => expect(mockResume).toHaveBeenCalledWith("a"));
    expect(mockToast.success).toHaveBeenCalledWith("Acompanhamento retomado");
  });

  test("retomar com o plano cheio (402 plan_limit) abre o paywall, sem erro solto", async () => {
    mockResume.mockRejectedValue(new ApiClientError(402, "plan_limit", "Limite do plano", undefined, "patients"));
    ready(patient({ pausedAt: PAUSED }));
    await renderApp(<Detalhe />);
    await fireEvent.press(screen.getByRole("button", { name: "Retomar acompanhamento" }));
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith("/plus?motivo=patients"));
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  test("outro erro ao retomar mostra a mensagem", async () => {
    mockResume.mockRejectedValue(new ApiClientError(500, "x", "Falhou"));
    ready(patient({ pausedAt: PAUSED }));
    await renderApp(<Detalhe />);
    await fireEvent.press(screen.getByRole("button", { name: "Retomar acompanhamento" }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Falhou"));
  });

  test("pausado, ainda dá para adicionar rotina (prescrever com antecedência)", async () => {
    ready(patient({ pausedAt: PAUSED }));
    await renderApp(<Detalhe />);
    expect(screen.getAllByRole("button", { name: "Adicionar" }).length).toBeGreaterThan(0);
  });
});

describe("avisos deste paciente (só para mim)", () => {
  test("ligado por padrão, nas duas abas, com a explicação de que só vale para a pessoa", async () => {
    ready();
    await renderApp(<Detalhe />);
    expect(screen.getByText("Receber avisos deste paciente")).toBeOnTheScreen();
    expect(screen.getByText(/Só vale para você/)).toBeOnTheScreen();
    expect(screen.getByRole("switch", { name: "Receber avisos deste paciente" })).toBeChecked();
    mockParams.value = { id: "a", aba: "dados" };
    await renderApp(<Detalhe />);
    expect(screen.getAllByRole("switch", { name: "Receber avisos deste paciente" }).length).toBeGreaterThan(0);
  });

  test("desligar chama a API para este paciente e o interruptor fica desligado", async () => {
    mockNotify.mockResolvedValue(undefined);
    ready();
    await renderApp(<Detalhe />);
    await fireEvent(screen.getByRole("switch", { name: "Receber avisos deste paciente" }), "valueChange", false);
    await waitFor(() => expect(mockNotify).toHaveBeenCalledWith({ id: "a", enabled: false }));
    expect(screen.getByRole("switch", { name: "Receber avisos deste paciente" })).not.toBeChecked();
  });

  test("paciente já silenciado vem desligado; ligar chama a API", async () => {
    mockNotify.mockResolvedValue(undefined);
    ready(patient({ notify: false }));
    await renderApp(<Detalhe />);
    expect(screen.getByRole("switch", { name: "Receber avisos deste paciente" })).not.toBeChecked();
    await fireEvent(screen.getByRole("switch", { name: "Receber avisos deste paciente" }), "valueChange", true);
    await waitFor(() => expect(mockNotify).toHaveBeenCalledWith({ id: "a", enabled: true }));
    expect(screen.getByRole("switch", { name: "Receber avisos deste paciente" })).toBeChecked();
  });

  test("se a API falhar, volta ao valor anterior e mostra o erro", async () => {
    mockNotify.mockRejectedValue(new ApiClientError(500, "x", "Falhou"));
    ready();
    await renderApp(<Detalhe />);
    await fireEvent(screen.getByRole("switch", { name: "Receber avisos deste paciente" }), "valueChange", false);
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Falhou"));
    expect(screen.getByRole("switch", { name: "Receber avisos deste paciente" })).toBeChecked();
  });
});

