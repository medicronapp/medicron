import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import type { ItemDto, PatientDto } from "@medicron/shared";
import { renderApp } from "./helpers";
import { ApiClientError } from "@/lib/api/errors";

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn(), setParams: jest.fn() };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => ({ id: "a" }), Stack: () => null }));
jest.mock("@/lib/clock", () => ({ now: () => new Date("2026-11-08T15:07:00.000Z") })); // 12:07 em Brasília
jest.mock("@/components/ui/toast", () => ({ toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() }, Toaster: () => null }));

const mockPick = { y: 2026, mo: 12, d: 1, h: 10, mi: 0 };
jest.mock("@react-native-community/datetimepicker", () => {
  const { Pressable } = require("react-native");
  return {
    __esModule: true,
    default: (p: { mode: string; accessibilityLabel?: string; onChange: (e: unknown, d: Date) => void }) => (
      <Pressable testID={`${p.accessibilityLabel}`} onPress={() => p.onChange({ type: "set" }, new Date(mockPick.y, mockPick.mo - 1, mockPick.d, mockPick.h, mockPick.mi))} />
    ),
    DateTimePickerAndroid: { open: jest.fn() },
  };
});

type Q<T> = { data?: T; isPending: boolean; isError: boolean; error?: unknown; refetch: jest.Mock };
const mockPatient: { value: Q<PatientDto> } = { value: { isPending: true, isError: false, refetch: jest.fn() } };
const mockItems: { value: Q<ItemDto[]> } = { value: { isPending: true, isError: false, refetch: jest.fn() } };
const mockCreate = jest.fn();
jest.mock("@/lib/patient-queries", () => ({
  usePatient: () => mockPatient.value,
  useItems: () => mockItems.value,
  useCreatePlan: () => ({ mutateAsync: (a: unknown) => mockCreate(a) }),
}));

import { toast as mockToast } from "@/components/ui/toast";
import NovaRotina from "@/app/(app)/pacientes/[id]/rotina/nova";

const item = (id: string, name: string, kind: ItemDto["kind"] = "medication"): ItemDto => ({ id, name, kind, defaultDose: null, notes: null, createdAt: "2026-01-01T00:00:00.000Z" });
const patient: PatientDto = { id: "a", name: "Izzy", species: "cat", birthDate: null, weightKg: null, notes: null, createdAt: "2026-01-01T00:00:00.000Z" };
const ready = (items: ItemDto[]) => {
  mockPatient.value = { data: patient, isPending: false, isError: false, refetch: jest.fn() };
  mockItems.value = { data: items, isPending: false, isError: false, refetch: jest.fn() };
};
const chooseItem = async (name: string) => {
  await fireEvent.press(screen.getByRole("button", { name: "Medicação ou procedimento" }));
  await fireEvent.press(await screen.findByRole("button", { name }));
};
const save = () => fireEvent.press(screen.getByRole("button", { name: "Salvar rotina" }));

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(mockPick, { y: 2026, mo: 12, d: 1, h: 10, mi: 0 });
  mockPatient.value = { isPending: true, isError: false, refetch: jest.fn() };
  mockItems.value = { isPending: true, isError: false, refetch: jest.fn() };
});

describe("tela", () => {
  test("carregando mostra o esqueleto", async () => {
    await renderApp(<NovaRotina />);
    expect(screen.getByLabelText("Carregando")).toBeOnTheScreen();
  });

  test("sem itens: vazio com 'Cadastrar item' (leva a /itens/novo)", async () => {
    ready([]);
    await renderApp(<NovaRotina />);
    expect(screen.getByRole("header", { name: "Nova rotina" })).toBeOnTheScreen();
    expect(screen.getByText("Izzy")).toBeOnTheScreen();
    expect(screen.getByText("Cadastre um item primeiro")).toBeOnTheScreen();
    expect(screen.getByText("Você precisa de ao menos uma medicação ou procedimento para montar a rotina.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Cadastrar item" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/itens/novo");
  });

  test("paciente 404 mostra 'Paciente não encontrado'", async () => {
    mockPatient.value = { isPending: false, isError: true, error: new ApiClientError(404, "not_found", "x"), refetch: jest.fn() };
    mockItems.value = { data: [], isPending: false, isError: false, refetch: jest.fn() };
    await renderApp(<NovaRotina />);
    expect(screen.getByText("Paciente não encontrado")).toBeOnTheScreen();
  });

  test("voltar leva ao detalhe do paciente", async () => {
    ready([item("i1", "Dipirona")]);
    await renderApp(<NovaRotina />);
    await fireEvent.press(screen.getByRole("button", { name: "Voltar" }));
    expect(mockRouter.navigate).toHaveBeenCalledWith("/pacientes/a");
  });
});

describe("formulário", () => {
  const items = [item("i1", "Dipirona"), item("i2", "Amoxicilina"), item("p1", "Temperatura", "procedure")];

  test("seções, dicas, padrões e grupos do seletor de item", async () => {
    ready(items);
    await renderApp(<NovaRotina />);
    for (const t of ["O quê", "Quando", "Até quando"]) expect(screen.getByText(t)).toBeOnTheScreen();
    expect(screen.getByText("Opcional. Se vazio, usa a dose padrão do item.")).toBeOnTheScreen();
    expect(screen.getByText("Ex.: 5")).toBeOnTheScreen();
    expect(screen.getByText("Horário de Brasília. Os próximos seguem a frequência a partir daqui.")).toBeOnTheScreen();
    expect(screen.getByText("Se uma dose atrasar, as próximas acompanham a hora real da aplicação.")).toBeOnTheScreen();
    expect(screen.getByText("Opcional. Deixe vazio para um uso contínuo.")).toBeOnTheScreen();
    expect(screen.getByText("A cada 8 horas")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Medicação ou procedimento" }));
    expect(await screen.findByText("Medicações")).toBeOnTheScreen();
    expect(screen.getByText("Procedimentos")).toBeOnTheScreen();
  });

  test("preset: corpo exato, primeira dose no próximo quarto de hora de Brasília em UTC", async () => {
    mockCreate.mockResolvedValue({});
    ready(items);
    await renderApp(<NovaRotina />);
    await chooseItem("Dipirona");
    await save();
    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    // 12:07 em Brasília → próximo quarto de hora 12:15 = 15:15Z
    expect(mockCreate).toHaveBeenCalledWith({ patientId: "a", body: { itemId: "i1", intervalMinutes: 480, anchorAt: "2026-11-08T15:15:00.000Z", reschedule: false } });
    expect(mockToast.success).toHaveBeenCalledWith("Salvo");
    expect(mockRouter.navigate).toHaveBeenCalledWith("/pacientes/a");
  });

  test("dose, frequência, reprogramar e data final vão no corpo (Brasília → UTC)", async () => {
    mockCreate.mockResolvedValue({});
    ready(items);
    await renderApp(<NovaRotina />);
    await chooseItem("Temperatura");
    await fireEvent.changeText(screen.getByLabelText("Dose / instrução"), " 1 comprimido ");
    await fireEvent.press(screen.getByRole("button", { name: "Frequência" }));
    await fireEvent.press(await screen.findByRole("button", { name: "A cada 12 horas" }));
    await fireEvent(screen.getByRole("switch", { name: "Reprogramar horários" }), "valueChange", true);
    await fireEvent.press(screen.getByRole("button", { name: "Selecionar" })); // data final: agora
    await fireEvent.press(screen.getByTestId("Data final, data")); // 2026-12-01
    await fireEvent.press(screen.getByTestId("Data final, hora")); // 10:00
    await save();
    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(mockCreate).toHaveBeenCalledWith({
      patientId: "a",
      body: { itemId: "p1", intervalMinutes: 720, anchorAt: "2026-11-08T15:15:00.000Z", endAt: "2026-12-01T13:00:00.000Z", dose: "1 comprimido", reschedule: true },
    });
  });

  test("item vazio mostra 'Selecione o item' e não envia", async () => {
    ready(items);
    await renderApp(<NovaRotina />);
    await save();
    expect(await screen.findByText("Selecione o item")).toBeOnTheScreen();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  const personalizada = async () => {
    await fireEvent.press(screen.getByRole("button", { name: "Frequência" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Personalizada…" }));
  };

  test("personalizada '1,5' vira 90 minutos", async () => {
    mockCreate.mockResolvedValue({});
    ready(items);
    await renderApp(<NovaRotina />);
    await chooseItem("Dipirona");
    await personalizada();
    await fireEvent.changeText(screen.getByLabelText("Se personalizada: a cada quantas horas?"), "1,5");
    await save();
    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ intervalMinutes: 90 }) })));
  });

  test.each(["", "abc", "0.05", "9000"])("personalizada '%s' mostra o erro e não envia", async (h) => {
    ready(items);
    await renderApp(<NovaRotina />);
    await chooseItem("Dipirona");
    await personalizada();
    await fireEvent.changeText(screen.getByLabelText("Se personalizada: a cada quantas horas?"), h);
    await save();
    expect(await screen.findByText("Informe um intervalo entre 5 minutos e 1 ano")).toBeOnTheScreen();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test("422 de data final mostra a mensagem do servidor e mantém o formulário preenchido", async () => {
    mockCreate.mockRejectedValue(new ApiClientError(422, "end_before_next_dose", "A data final é anterior à próxima dose"));
    ready(items);
    await renderApp(<NovaRotina />);
    await chooseItem("Dipirona");
    await fireEvent.changeText(screen.getByLabelText("Dose / instrução"), "3 gotas");
    await save();
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("A data final é anterior à próxima dose"));
    expect(mockRouter.navigate).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Dose / instrução").props.value).toBe("3 gotas");
    expect(screen.getByRole("button", { name: "Salvar rotina" })).toBeEnabled();
  });

  test("toque duplo em salvar envia uma vez", async () => {
    let finish: (v: unknown) => void = () => {};
    mockCreate.mockReturnValue(new Promise((r) => { finish = r; }));
    ready(items);
    await renderApp(<NovaRotina />);
    await chooseItem("Dipirona");
    const b = screen.getByRole("button", { name: "Salvar rotina" });
    await fireEvent.press(b);
    await fireEvent.press(b);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    finish({});
    await waitFor(() => expect(mockRouter.navigate).toHaveBeenCalled());
  });
});
