import { fireEvent, screen, waitFor } from "@testing-library/react-native";
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
const mockUpdatePlan = jest.fn();
const mockDeactivate = jest.fn();
jest.mock("@/lib/patient-queries", () => ({
  usePatient: () => mockPatient.value,
  usePlans: () => mockPlans.value,
  useUpdatePatient: () => ({ mutateAsync: (a: unknown) => mockUpdatePatient(a) }),
  useArchivePatient: () => ({ mutateAsync: (a: unknown) => mockArchive(a) }),
  useUpdatePlan: () => ({ mutateAsync: (a: unknown) => mockUpdatePlan(a) }),
  useDeactivatePlan: () => ({ mutateAsync: (a: unknown) => mockDeactivate(a) }),
}));

import { toast as mockToast } from "@/components/ui/toast";
import Detalhe from "@/app/(app)/pacientes/[id]/index";

const patient = (o: Partial<PatientDto> = {}): PatientDto => ({
  id: "a", name: "Izzy", species: "cat", birthDate: null, weightKg: null, notes: null, createdAt: "2026-01-01T00:00:00.000Z", ...o,
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

  test("mostra os valores atuais (data final no relógio de Brasília)", async () => {
    ready(patient(), [plan({ dose: "2 gotas", endAt: "2026-12-01T13:00:00.000Z", reschedule: true })]);
    await renderApp(<Detalhe />);
    await open();
    expect(screen.getByLabelText("Dose / instrução").props.value).toBe("2 gotas");
    expect(screen.getByRole("switch", { name: "Reprogramar horários" })).toBeChecked();
    expect(screen.getByText("Se uma dose atrasar, as próximas acompanham a hora real da aplicação.")).toBeOnTheScreen();
    expect(screen.getByText("Opcional. Deixe vazio para um uso contínuo.")).toBeOnTheScreen();
  });

  test("salvar envia dose, data final (Brasília → UTC) e reprogramar; avisa e fecha", async () => {
    mockUpdatePlan.mockResolvedValue(plan());
    ready(patient(), [plan()]);
    await renderApp(<Detalhe />);
    await open();
    await fireEvent.changeText(screen.getByLabelText("Dose / instrução"), " 2 gotas ");
    await fireEvent.press(screen.getByRole("button", { name: "Selecionar" })); // data final: agora 12:00
    await fireEvent.press(screen.getByTestId("picker-date")); // 2026-12-01
    await fireEvent.press(screen.getByTestId("picker-time")); // 10:00
    await fireEvent(screen.getByRole("switch", { name: "Reprogramar horários" }), "valueChange", true);
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(mockUpdatePlan).toHaveBeenCalledWith({ planId: "p1", body: { dose: "2 gotas", endAt: "2026-12-01T13:00:00.000Z", reschedule: true } }));
    expect(mockToast.success).toHaveBeenCalledWith("Rotina atualizada");
    await waitFor(() => expect(screen.queryByText("Izzy · editar rotina")).toBeNull());
  });

  test("dose em branco e data final vazia vão como null", async () => {
    mockUpdatePlan.mockResolvedValue(plan());
    ready(patient(), [plan({ dose: "x" })]);
    await renderApp(<Detalhe />);
    await open();
    await fireEvent.changeText(screen.getByLabelText("Dose / instrução"), "   ");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(mockUpdatePlan).toHaveBeenCalledWith({ planId: "p1", body: { dose: null, endAt: null, reschedule: false } }));
  });

  test("422 de data final mostra a mensagem do servidor e mantém o sheet e o que foi digitado", async () => {
    mockUpdatePlan.mockRejectedValue(new ApiClientError(422, "end_before_next_dose", "A data final é anterior à próxima dose"));
    ready(patient(), [plan()]);
    await renderApp(<Detalhe />);
    await open();
    await fireEvent.changeText(screen.getByLabelText("Dose / instrução"), "3 gotas");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("A data final é anterior à próxima dose"));
    expect(screen.getByText("Izzy · editar rotina")).toBeOnTheScreen();
    expect(screen.getByLabelText("Dose / instrução").props.value).toBe("3 gotas");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
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
