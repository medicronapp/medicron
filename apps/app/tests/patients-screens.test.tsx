import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import type { PatientDto } from "@medicron/shared";
import { renderApp } from "./helpers";

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => ({}), Stack: () => null }));
jest.mock("@/lib/clock", () => ({ now: () => new Date("2026-11-08T15:00:00.000Z") }));
jest.mock("@/components/ui/toast", () => ({ toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() }, Toaster: () => null }));

type Q = { data?: PatientDto[]; isPending: boolean; isError: boolean; isRefetching: boolean; refetch: jest.Mock };
const mockList: { value: Q } = { value: { isPending: true, isError: false, isRefetching: false, refetch: jest.fn() } };
const mockCreate = jest.fn();
jest.mock("@/lib/patient-queries", () => ({
  usePatients: () => mockList.value,
  useCreatePatient: () => ({ mutateAsync: (b: unknown) => mockCreate(b), isPending: false }),
}));

import { toast as mockToast } from "@/components/ui/toast";
import Lista from "@/app/(app)/pacientes/index";
import Novo from "@/app/(app)/pacientes/novo";

const p = (id: string, name: string, o: Partial<PatientDto> = {}): PatientDto => ({
  id, name, species: "cat", birthDate: null, weightKg: null, notes: null, createdAt: "2026-01-01T00:00:00.000Z", ...o,
});
const ready = (data: PatientDto[]) => { mockList.value = { data, isPending: false, isError: false, isRefetching: false, refetch: jest.fn() }; };

beforeEach(() => {
  jest.clearAllMocks();
  mockList.value = { isPending: true, isError: false, isRefetching: false, refetch: jest.fn() };
});

describe("lista de pacientes", () => {
  test("carregando mostra o esqueleto", async () => {
    await renderApp(<Lista />);
    expect(screen.getByLabelText("Carregando")).toBeOnTheScreen();
  });

  test("erro mostra a tela de erro e 'Tentar de novo' refaz", async () => {
    mockList.value = { isPending: false, isError: true, isRefetching: false, refetch: jest.fn() };
    await renderApp(<Lista />);
    expect(screen.getByRole("header", { name: "Algo deu errado" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(mockList.value.refetch).toHaveBeenCalledTimes(1);
  });

  test("vazio: título, descrição e botão (sem contagem no cabeçalho)", async () => {
    ready([]);
    await renderApp(<Lista />);
    expect(screen.getByRole("header", { name: "Pacientes" })).toBeOnTheScreen();
    expect(screen.getByText("Nenhum paciente cadastrado")).toBeOnTheScreen();
    expect(screen.getByText("Cadastre o primeiro para montar a rotina de cuidados.")).toBeOnTheScreen();
    expect(screen.queryByText(/nesta conta/)).toBeNull();
    const buttons = screen.getAllByRole("button", { name: "Novo paciente" });
    await fireEvent.press(buttons[0]);
    expect(mockRouter.push).toHaveBeenCalledWith("/pacientes/novo");
  });

  test("1 paciente: singular na descrição", async () => {
    ready([p("a", "Izzy")]);
    await renderApp(<Lista />);
    expect(screen.getByText("1 paciente nesta conta")).toBeOnTheScreen();
  });

  test("3 pacientes: plural; tocar no cartão abre o detalhe", async () => {
    ready([p("a", "Izzy"), p("b", "Bob", { species: "dog" }), p("c", "Ana", { species: "human" })]);
    await renderApp(<Lista />);
    expect(screen.getByText("3 pacientes nesta conta")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: /^Bob/ }));
    expect(mockRouter.push).toHaveBeenCalledWith("/pacientes/b");
    await fireEvent.press(screen.getByRole("button", { name: "Novo paciente" }));
    expect(mockRouter.push).toHaveBeenLastCalledWith("/pacientes/novo");
  });

  test("puxar para atualizar refaz a consulta", async () => {
    ready([p("a", "Izzy")]);
    await renderApp(<Lista />);
    await act(async () => { screen.getByTestId("patients-scroll").props.refreshControl.props.onRefresh(); });
    expect(mockList.value.refetch).toHaveBeenCalledTimes(1);
  });
});

describe("novo paciente", () => {
  const fill = async () => {
    await fireEvent.changeText(screen.getByLabelText("Nome"), "Izzy");
    await fireEvent.press(screen.getByRole("button", { name: "Tipo" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Gato" }));
  };

  test("título e voltar", async () => {
    await renderApp(<Novo />);
    expect(screen.getByRole("header", { name: "Novo paciente" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Voltar" }));
    expect(mockRouter.navigate).toHaveBeenCalledWith("/pacientes");
  });

  test("salvar cria, avisa e abre o detalhe", async () => {
    mockCreate.mockResolvedValue(p("novo-id", "Izzy"));
    await renderApp(<Novo />);
    await fill();
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/pacientes/novo-id"));
    expect(mockCreate).toHaveBeenCalledWith({ name: "Izzy", species: "cat" });
    expect(mockToast.success).toHaveBeenCalledWith("Salvo");
  });

  test("erro da API avisa e mantém o formulário preenchido", async () => {
    mockCreate.mockRejectedValue(new Error("Dados inválidos."));
    await renderApp(<Novo />);
    await fill();
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Dados inválidos."));
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Nome").props.value).toBe("Izzy");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
  });
});
