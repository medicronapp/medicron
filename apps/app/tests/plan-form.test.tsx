import { fireEvent, screen, waitFor, within } from "@testing-library/react-native";
import type { ItemDto, PatientDto } from "@medicron/shared";
import { renderApp } from "./helpers";
import { ApiClientError } from "@/lib/api/errors";

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), dismissTo: jest.fn(), back: jest.fn(), setParams: jest.fn() };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => ({ id: "a" }), Stack: () => null }));
jest.mock("@/lib/clock", () => ({ now: () => new Date("2026-11-08T15:07:00.000Z") })); // 12:07 em Brasília
jest.mock("@/components/ui/toast", () => ({ toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() }, Toaster: () => null }));

const mockWide = { value: false };
jest.mock("@/lib/use-breakpoint", () => ({ useIsWide: () => mockWide.value }));

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

const mockCreateItem = jest.fn();
jest.mock("@/lib/item-queries", () => ({ useCreateItem: () => ({ mutateAsync: (b: unknown) => mockCreateItem(b) }) }));

import { toast as mockToast } from "@/components/ui/toast";
import NovaRotina from "@/app/(app)/pacientes/[id]/rotina/nova";

const item = (id: string, name: string, kind: ItemDto["kind"] = "medication"): ItemDto => ({ id, name, kind, defaultDose: null, notes: null, createdAt: "2026-01-01T00:00:00.000Z" });
const patient: PatientDto = { id: "a", name: "Izzy", species: "cat", birthDate: null, weightKg: null, notes: null, pausedAt: null, notify: true, createdAt: "2026-01-01T00:00:00.000Z" };
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
  mockWide.value = false;
  mockPatient.value = { isPending: true, isError: false, refetch: jest.fn() };
  mockItems.value = { isPending: true, isError: false, refetch: jest.fn() };
});

describe("tela", () => {
  test("carregando mostra o esqueleto", async () => {
    await renderApp(<NovaRotina />);
    expect(screen.getByLabelText("Carregando")).toBeOnTheScreen();
  });

  test("sem itens: o formulário de criar item já aparece aqui mesmo (sem mandar sair da tela)", async () => {
    ready([]);
    await renderApp(<NovaRotina />);
    expect(screen.getByRole("header", { name: "Nova rotina" })).toBeOnTheScreen();
    expect(screen.getByText("Izzy")).toBeOnTheScreen();
    expect(screen.getByText("Crie o primeiro item desta rotina")).toBeOnTheScreen();
    expect(screen.getByLabelText("Nome do item")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Medicação ou procedimento" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
    expect(mockRouter.push).not.toHaveBeenCalled();
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
    expect(mockRouter.dismissTo).toHaveBeenCalledWith("/pacientes/a");
  });
});

describe("formulário", () => {
  const items = [item("i1", "Dipirona"), item("i2", "Amoxicilina"), item("p1", "Temperatura", "procedure")];
  const tap = (name: string) => fireEvent.press(screen.getByRole("button", { name }));

  test("seções, padrões (3x ao dia, agora, contínuo) e grupos do seletor de item", async () => {
    ready(items);
    await renderApp(<NovaRotina />);
    for (const t of ["O quê", "Quantas vezes?", "Primeira dose", "Por quanto tempo?"]) expect(screen.getByText(t)).toBeOnTheScreen();
    expect(screen.getByText("Opcional. Se vazio, usa a dose padrão do item.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "3x ao dia" })).toBeSelected();
    expect(screen.getByRole("button", { name: "Agora" })).toBeSelected();
    expect(screen.getByText("Hoje às 12:07")).toBeOnTheScreen();
    expect(screen.getByText("Hoje às 13:00")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Contínuo" })).toBeSelected();
    await fireEvent.press(screen.getByRole("button", { name: "Medicação ou procedimento" }));
    expect(await screen.findByText("Medicações")).toBeOnTheScreen();
    expect(screen.getByText("Procedimentos")).toBeOnTheScreen();
  });

  test("padrões: corpo exato (3x ao dia = 480 min, primeira dose agora em UTC, sem data final)", async () => {
    mockCreate.mockResolvedValue({});
    ready(items);
    await renderApp(<NovaRotina />);
    await chooseItem("Dipirona");
    await save();
    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(mockCreate).toHaveBeenCalledWith({ patientId: "a", body: { itemId: "i1", intervalMinutes: 480, anchorAt: "2026-11-08T15:07:00.000Z", reschedule: false } });
    expect(mockToast.success).toHaveBeenCalledWith("Salvo");
    expect(mockRouter.dismissTo).toHaveBeenCalledWith("/pacientes/a");
  });

  test("a frase e as próximas doses acompanham as escolhas", async () => {
    ready(items);
    await renderApp(<NovaRotina />);
    await chooseItem("Temperatura");
    await tap("A cada 4 h");
    await tap("7 dias");
    expect(screen.getByRole("button", { name: "A cada 4 h" })).toBeSelected();
    expect(screen.getByRole("button", { name: "3x ao dia" })).not.toBeSelected();
    expect(screen.getByText("Temperatura, a cada 4 horas, por 7 dias")).toBeOnTheScreen();
    expect(screen.getByText("6 doses por dia")).toBeOnTheScreen();
    expect(screen.getByText("Começa hoje às 12:07 · termina em 14/11")).toBeOnTheScreen();
    const doses = screen.getByLabelText("Próximas doses");
    for (const t of ["12:07", "16:07", "20:07", "00:07", "04:07"]) expect(within(doses).getByText(t)).toBeOnTheScreen();
  });

  test("frequência, duração, dose e 'ajustar se eu atrasar' vão no corpo (Brasília → UTC)", async () => {
    mockCreate.mockResolvedValue({});
    ready(items);
    await renderApp(<NovaRotina />);
    await chooseItem("Temperatura");
    await fireEvent.changeText(screen.getByLabelText("Dose / instrução"), " 1 comprimido ");
    await tap("2x ao dia");
    await tap("7 dias");
    await fireEvent(screen.getByRole("switch", { name: "Ajustar se eu atrasar" }), "valueChange", true);
    await save();
    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    // 7 dias a partir de 08/11 terminam em 14/11 às 23:59 (Brasília) = 15/11 02:59Z
    expect(mockCreate).toHaveBeenCalledWith({
      patientId: "a",
      body: { itemId: "p1", intervalMinutes: 720, anchorAt: "2026-11-08T15:07:00.000Z", endAt: "2026-11-15T02:59:00.000Z", dose: "1 comprimido", reschedule: true },
    });
  });

  test("'Até uma data…' abre o seletor de data e vale até o fim desse dia", async () => {
    mockCreate.mockResolvedValue({});
    ready(items);
    await renderApp(<NovaRotina />);
    await chooseItem("Dipirona");
    await tap("Até uma data…");
    await fireEvent.press(screen.getByTestId("Data final")); // 2026-12-01
    expect(screen.getByText("Dipirona, a cada 8 horas, até 01/12")).toBeOnTheScreen();
    await save();
    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ endAt: "2026-12-02T02:59:00.000Z" }) })));
  });

  test("'Na próxima hora cheia' começa às 13:00 de Brasília", async () => {
    mockCreate.mockResolvedValue({});
    ready(items);
    await renderApp(<NovaRotina />);
    await chooseItem("Dipirona");
    await tap("Na próxima hora cheia");
    expect(screen.getByRole("button", { name: "Na próxima hora cheia" })).toBeSelected();
    await save();
    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ anchorAt: "2026-11-08T16:00:00.000Z" }) })));
  });

  describe("escolher o horário", () => {
    const open = async () => {
      await tap("Escolher o horário");
    };

    test("rodas de hora e minuto no dia de hoje", async () => {
      mockCreate.mockResolvedValue({});
      ready(items);
      await renderApp(<NovaRotina />);
      await chooseItem("Dipirona");
      await open();
      expect(screen.getByRole("tab", { name: "Hoje" })).toBeSelected();
      await tap("Hora 14");
      await tap("Minuto 30");
      expect(screen.getByText("Hoje às 14:30")).toBeOnTheScreen();
      await save();
      await waitFor(() => expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ anchorAt: "2026-11-08T17:30:00.000Z" }) })));
    });

    test("atalho de horário que já passou hoje vai para amanhã", async () => {
      mockCreate.mockResolvedValue({});
      ready(items);
      await renderApp(<NovaRotina />);
      await chooseItem("Dipirona");
      await open();
      await tap("Manhã 08:00"); // são 12:07
      expect(screen.getByRole("tab", { name: "Amanhã" })).toBeSelected();
      expect(screen.getByText("Amanhã às 08:00")).toBeOnTheScreen();
      await save();
      await waitFor(() => expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ anchorAt: "2026-11-09T11:00:00.000Z" }) })));
    });

    test("'Outro dia…' usa o seletor de data", async () => {
      mockCreate.mockResolvedValue({});
      ready(items);
      await renderApp(<NovaRotina />);
      await chooseItem("Dipirona");
      await open();
      await tap("Noite 20:00");
      await fireEvent.press(screen.getByRole("tab", { name: "Outro dia…" }));
      await fireEvent.press(screen.getByTestId("Dia da primeira dose")); // 2026-12-01
      expect(screen.getByText("01/12 às 20:00")).toBeOnTheScreen();
      await save();
      await waitFor(() => expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ anchorAt: "2026-12-01T23:00:00.000Z" }) })));
    });

    test("hoje, mudar a hora para uma que já passou avisa e leva para amanhã", async () => {
      ready(items);
      await renderApp(<NovaRotina />);
      await open();
      await tap("Hora 09");
      expect(screen.getByRole("tab", { name: "Amanhã" })).toBeSelected();
    });
  });

  describe("no desktop, o horário abre num diálogo em 2 passos", () => {
    beforeEach(() => { mockWide.value = true; });
    const openDialog = async () => {
      await tap("Escolher o horário");
      await screen.findByText("Em que dia?");
    };

    test("passo 1 só tem o calendário; passo 2 só a hora; nada espalhado na página", async () => {
      mockCreate.mockResolvedValue({});
      ready(items);
      await renderApp(<NovaRotina />);
      await chooseItem("Dipirona");
      expect(screen.queryByText("Em que dia?")).toBeNull();
      await openDialog();
      expect(screen.getByText("Passo 1 de 2")).toBeOnTheScreen();
      expect(screen.getByText("novembro de 2026")).toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: "Noite 20:00" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Hora 20" })).toBeNull();
      await fireEvent.press(screen.getByRole("button", { name: "20 de novembro de 2026" }));
      await tap("Continuar");
      expect(await screen.findByText("A que horas?")).toBeOnTheScreen();
      expect(screen.getByText("Passo 2 de 2 · 20/11")).toBeOnTheScreen();
      expect(screen.queryByText("novembro de 2026")).toBeNull();
      await tap("Hora 20");
      await tap("Minuto 00");
      expect(screen.getByText("20/11 às 20:00")).toBeOnTheScreen(); // subtítulo do cartão
      await tap("Confirmar 20/11 às 20:00");
      expect(screen.queryByText("A que horas?")).toBeNull();
      await save();
      await waitFor(() => expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ anchorAt: "2026-11-20T23:00:00.000Z" }) })));
    });

    test("passo 2 tem a roleta de hora e minuto e os atalhos (sem grade de horários)", async () => {
      ready(items);
      await renderApp(<NovaRotina />);
      await openDialog();
      await fireEvent.press(screen.getByRole("button", { name: "9 de novembro de 2026" }));
      await tap("Continuar");
      await tap("Manhã 08:00");
      expect(screen.getByText("Amanhã às 08:00")).toBeOnTheScreen();
      await tap("Minuto 15");
      expect(screen.getByText("Amanhã às 08:15")).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Confirmar amanhã às 08:15" })).toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: "08:30" })).toBeNull();
      expect(screen.queryByLabelText("Horário exato")).toBeNull();
    });

    test("hoje, escolher uma hora que já passou leva para amanhã", async () => {
      ready(items);
      await renderApp(<NovaRotina />);
      await openDialog();
      await tap("Continuar"); // hoje, 12:07
      await tap("Hora 09");
      expect(screen.getByText("Passo 2 de 2 · 09/11")).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Confirmar amanhã às 09:00" })).toBeOnTheScreen();
    });

    test("'Voltar' leva ao calendário; reabrir o cartão começa no passo 1", async () => {
      ready(items);
      await renderApp(<NovaRotina />);
      await openDialog();
      await tap("Continuar");
      await tap("Voltar ao calendário");
      expect(await screen.findByText("Em que dia?")).toBeOnTheScreen();
      await tap("Continuar");
      await tap("Confirmar hoje às 13:00");
      await tap("Escolher o horário");
      expect(await screen.findByText("Em que dia?")).toBeOnTheScreen();
    });

    test("escolher hoje ou amanhã no calendário vira 'Hoje'/'Amanhã'; dias passados ficam desligados", async () => {
      ready(items);
      await renderApp(<NovaRotina />);
      await openDialog();
      expect(screen.getByRole("button", { name: "7 de novembro de 2026" })).toBeDisabled();
      await fireEvent.press(screen.getByRole("button", { name: "9 de novembro de 2026" }));
      expect(screen.getByText("Amanhã às 13:00")).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole("button", { name: "8 de novembro de 2026, hoje" }));
      expect(screen.getAllByText("Hoje às 13:00")).toHaveLength(2); // este cartão e o da próxima hora cheia
    });
  });

  describe("outra frequência", () => {
    test("'Outra…' começa na frequência atual e o contador soma e subtrai", async () => {
      mockCreate.mockResolvedValue({});
      ready(items);
      await renderApp(<NovaRotina />);
      await chooseItem("Dipirona");
      await tap("Outra…");
      expect(screen.getByRole("button", { name: "Outra…" })).toBeSelected();
      expect(screen.getByLabelText("Quantidade").props.value).toBe("8");
      expect(screen.getByRole("tab", { name: "Horas" })).toBeSelected();
      await tap("Aumentar");
      expect(screen.getByLabelText("Quantidade").props.value).toBe("9");
      await save();
      await waitFor(() => expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ intervalMinutes: 540 }) })));
    });

    test("digitar a quantidade e trocar a unidade (3 dias)", async () => {
      mockCreate.mockResolvedValue({});
      ready(items);
      await renderApp(<NovaRotina />);
      await chooseItem("Dipirona");
      await tap("Outra…");
      await fireEvent.press(screen.getByRole("tab", { name: "Dias" }));
      await fireEvent.changeText(screen.getByLabelText("Quantidade"), "3");
      await save();
      await waitFor(() => expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ intervalMinutes: 4320 }) })));
    });

    test("minutos andam de 5 em 5 e não passam de 5 para baixo", async () => {
      ready(items);
      await renderApp(<NovaRotina />);
      await tap("Outra…");
      await fireEvent.press(screen.getByRole("tab", { name: "Minutos" }));
      await fireEvent.changeText(screen.getByLabelText("Quantidade"), "10");
      await tap("Diminuir");
      expect(screen.getByLabelText("Quantidade").props.value).toBe("5");
      expect(screen.getByRole("button", { name: "Diminuir" })).toBeDisabled();
    });

    test.each(["", "0", "abc", "4"])("quantidade '%s' em minutos mostra o erro e não envia", async (q) => {
      ready(items);
      await renderApp(<NovaRotina />);
      await chooseItem("Dipirona");
      await tap("Outra…");
      await fireEvent.press(screen.getByRole("tab", { name: "Minutos" }));
      await fireEvent.changeText(screen.getByLabelText("Quantidade"), q);
      await save();
      expect(await screen.findByText("Informe um intervalo entre 5 minutos e 1 ano")).toBeOnTheScreen();
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe("criar item na hora", () => {
    const created = item("n1", "Soro fisiológico", "procedure");
    const openCreator = () => fireEvent.press(screen.getByRole("button", { name: "Criar item novo" }));

    test("cria, já deixa selecionado e a rotina usa o item novo", async () => {
      mockCreateItem.mockResolvedValue(created);
      mockCreate.mockResolvedValue({});
      ready(items);
      await renderApp(<NovaRotina />);
      await openCreator();
      await fireEvent.press(screen.getByRole("tab", { name: "Procedimento" }));
      await fireEvent.changeText(screen.getByLabelText("Nome do item"), "  Soro fisiológico ");
      await fireEvent.press(screen.getByRole("button", { name: "Criar item" }));
      await waitFor(() => expect(mockCreateItem).toHaveBeenCalledWith({ name: "Soro fisiológico", kind: "procedure" }));
      expect(await screen.findByText("Soro fisiológico, a cada 8 horas, uso contínuo")).toBeOnTheScreen();
      expect(screen.queryByLabelText("Nome do item")).toBeNull(); // o formulário se recolhe
      await save();
      await waitFor(() => expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ itemId: "n1" }) })));
    });

    test("nome vazio avisa e não cria; Cancelar recolhe", async () => {
      ready(items);
      await renderApp(<NovaRotina />);
      await openCreator();
      await fireEvent.press(screen.getByRole("button", { name: "Criar item" }));
      expect(await screen.findByText("Informe o nome")).toBeOnTheScreen();
      expect(mockCreateItem).not.toHaveBeenCalled();
      await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));
      expect(screen.queryByLabelText("Nome do item")).toBeNull();
    });

    test("erro do servidor mostra a mensagem e mantém o que foi digitado", async () => {
      mockCreateItem.mockRejectedValue(new ApiClientError(422, "invalid", "Nome inválido"));
      ready(items);
      await renderApp(<NovaRotina />);
      await openCreator();
      await fireEvent.changeText(screen.getByLabelText("Nome do item"), "X");
      await fireEvent.press(screen.getByRole("button", { name: "Criar item" }));
      await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Nome inválido"));
      expect(screen.getByLabelText("Nome do item").props.value).toBe("X");
    });

    test("sem itens: criar o primeiro já leva ao seletor com ele escolhido", async () => {
      mockCreateItem.mockResolvedValue(created);
      ready([]);
      await renderApp(<NovaRotina />);
      await fireEvent.changeText(screen.getByLabelText("Nome do item"), "Soro fisiológico");
      await fireEvent.press(screen.getByRole("button", { name: "Criar item" }));
      expect(await screen.findByText("Soro fisiológico, a cada 8 horas, uso contínuo")).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Criar item novo" })).toBeOnTheScreen();
    });

    test("toque duplo em 'Criar item' cria uma vez só", async () => {
      let finish: (v: unknown) => void = () => {};
      mockCreateItem.mockReturnValue(new Promise((r) => { finish = r; }));
      ready(items);
      await renderApp(<NovaRotina />);
      await openCreator();
      await fireEvent.changeText(screen.getByLabelText("Nome do item"), "Soro");
      const b = screen.getByRole("button", { name: "Criar item" });
      await fireEvent.press(b);
      await fireEvent.press(b);
      expect(mockCreateItem).toHaveBeenCalledTimes(1);
      finish(created);
      await screen.findByText("Soro fisiológico, a cada 8 horas, uso contínuo");
    });
  });

  test("item vazio mostra 'Selecione o item' e não envia", async () => {
    ready(items);
    await renderApp(<NovaRotina />);
    await save();
    expect(await screen.findByText("Selecione o item")).toBeOnTheScreen();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test("data final antes da primeira dose avisa e não envia", async () => {
    ready(items);
    await renderApp(<NovaRotina />);
    await chooseItem("Dipirona");
    await tap("Até uma data…");
    Object.assign(mockPick, { mo: 11, d: 10 });
    await fireEvent.press(screen.getByTestId("Data final")); // termina em 10/11
    await tap("Escolher o horário");
    await fireEvent.press(screen.getByRole("tab", { name: "Outro dia…" }));
    Object.assign(mockPick, { mo: 12, d: 1 });
    await fireEvent.press(screen.getByTestId("Dia da primeira dose")); // começa em 01/12
    await save();
    expect(await screen.findByText("A data final precisa ser depois da primeira dose")).toBeOnTheScreen();
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
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
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
    await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalled());
  });
});
