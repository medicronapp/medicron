import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import type { ItemDto } from "@medicron/shared";
import { renderApp } from "./helpers";

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), dismissTo: jest.fn(), back: jest.fn(), setParams: jest.fn() };
const mockParams: { value: Record<string, string> } = { value: {} };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => mockParams.value, Stack: () => null }));
jest.mock("@/components/ui/toast", () => ({ toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() }, Toaster: () => null }));

type Q = { data?: ItemDto[]; isPending: boolean; isError: boolean; isRefetching: boolean; refetch: jest.Mock };
const mockList: { value: Q } = { value: { isPending: true, isError: false, isRefetching: false, refetch: jest.fn() } };
const mockUseItems = jest.fn((_k?: string) => mockList.value);
const mockCreate = jest.fn();
jest.mock("@/lib/item-queries", () => ({
  useItems: (k?: string) => mockUseItems(k),
  useCreateItem: () => ({ mutateAsync: (b: unknown) => mockCreate(b) }),
}));

import { toast as mockToast } from "@/components/ui/toast";
import Lista from "@/app/(app)/itens/index";
import Novo from "@/app/(app)/itens/novo";

const it = (id: string, name: string, o: Partial<ItemDto> = {}): ItemDto => ({ id, name, kind: "medication", defaultDose: null, notes: null, createdAt: "2026-01-01T00:00:00.000Z", ...o });
const ready = (data: ItemDto[]) => { mockList.value = { data, isPending: false, isError: false, isRefetching: false, refetch: jest.fn() }; };

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.value = {};
  mockList.value = { isPending: true, isError: false, isRefetching: false, refetch: jest.fn() };
});

describe("lista de itens", () => {
  test("carregando mostra o esqueleto; erro mostra a tela de erro e refaz", async () => {
    const { unmount } = await renderApp(<Lista />);
    expect(screen.getByLabelText("Carregando")).toBeOnTheScreen();
    await unmount();
    mockList.value = { isPending: false, isError: true, isRefetching: false, refetch: jest.fn() };
    await renderApp(<Lista />);
    await fireEvent.press(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(mockList.value.refetch).toHaveBeenCalledTimes(1);
  });

  test("carregando e erro mantêm o título e as abas (dá para trocar de aba e tocar em Novo)", async () => {
    const { unmount } = await renderApp(<Lista />);
    expect(screen.getByLabelText("Carregando")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Itens" })).toBeOnTheScreen();
    expect(screen.getByRole("tab", { name: "Procedimentos" })).toBeOnTheScreen();
    await unmount();
    mockList.value = { isPending: false, isError: true, isRefetching: false, refetch: jest.fn() };
    await renderApp(<Lista />);
    expect(screen.getByRole("header", { name: "Itens" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("tab", { name: "Procedimentos" }));
    expect(mockRouter.setParams).toHaveBeenCalledWith({ tipo: "procedure" });
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeOnTheScreen();
  });

  test("título, descrição e abas (Medicações por padrão; consulta só o tipo da aba)", async () => {
    ready([]);
    await renderApp(<Lista />);
    expect(screen.getByRole("header", { name: "Itens" })).toBeOnTheScreen();
    expect(screen.getByText("Medicações e procedimentos que entram nas rotinas.")).toBeOnTheScreen();
    expect(screen.getByRole("tab", { name: "Medicações" })).toBeSelected();
    expect(mockUseItems).toHaveBeenCalledWith("medication");
  });

  test("tipo=procedure abre Procedimentos; valor inválido cai em Medicações", async () => {
    ready([]);
    mockParams.value = { tipo: "procedure" };
    const { unmount } = await renderApp(<Lista />);
    expect(screen.getByRole("tab", { name: "Procedimentos" })).toBeSelected();
    expect(mockUseItems).toHaveBeenCalledWith("procedure");
    await unmount();
    mockParams.value = { tipo: "qualquer-coisa" };
    await renderApp(<Lista />);
    expect(screen.getByRole("tab", { name: "Medicações" })).toBeSelected();
  });

  test("trocar de aba muda o parâmetro", async () => {
    ready([]);
    await renderApp(<Lista />);
    await fireEvent.press(screen.getByRole("tab", { name: "Procedimentos" }));
    expect(mockRouter.setParams).toHaveBeenCalledWith({ tipo: "procedure" });
  });

  test("vazio de medicações e de procedimentos, com o botão Novo no tipo da aba", async () => {
    ready([]);
    const { unmount } = await renderApp(<Lista />);
    expect(screen.getByText("Nenhuma medicação")).toBeOnTheScreen();
    expect(screen.getByText("Ex.: antibiótico, anti-inflamatório, vitamina.")).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole("button", { name: "Novo" })[0]);
    expect(mockRouter.push).toHaveBeenLastCalledWith("/itens/novo?tipo=medication");
    await unmount();
    mockParams.value = { tipo: "procedure" };
    await renderApp(<Lista />);
    expect(screen.getByText("Nenhum procedimento")).toBeOnTheScreen();
    expect(screen.getByText("Ex.: medir temperatura, limpar um ferimento.")).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole("button", { name: "Novo" })[0]);
    expect(mockRouter.push).toHaveBeenLastCalledWith("/itens/novo?tipo=procedure");
  });

  test("com itens: cartões; tocar abre o detalhe", async () => {
    ready([it("a", "Amoxicilina", { defaultDose: "1 cp" }), it("b", "Dipirona")]);
    await renderApp(<Lista />);
    expect(screen.getByText("Medicação · 1 cp")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Dipirona" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/itens/b");
  });

  test("puxar para atualizar refaz a consulta", async () => {
    ready([it("a", "Amoxicilina")]);
    await renderApp(<Lista />);
    await act(async () => { screen.getByTestId("items-scroll").props.refreshControl.props.onRefresh(); });
    expect(mockList.value.refetch).toHaveBeenCalledTimes(1);
  });
});

describe("novo item", () => {
  const fill = (name = "Dipirona") => fireEvent.changeText(screen.getByLabelText("Nome"), name);

  test("título, tipo da rota como padrão e voltar à lista do tipo", async () => {
    mockParams.value = { tipo: "procedure" };
    await renderApp(<Novo />);
    expect(screen.getByRole("header", { name: "Novo item" })).toBeOnTheScreen();
    expect(screen.getByRole("tab", { name: "Procedimento" })).toBeSelected();
    await fireEvent.press(screen.getByRole("button", { name: "Voltar" }));
    expect(mockRouter.dismissTo).toHaveBeenCalledWith("/itens?tipo=procedure");
  });

  test("tipo inválido cai em medicação", async () => {
    mockParams.value = { tipo: "xx" };
    await renderApp(<Novo />);
    expect(screen.getByRole("tab", { name: "Medicação" })).toBeSelected();
  });

  test("salvar cria, avisa e volta à lista do tipo do item criado (mesmo que seja o outro tipo)", async () => {
    mockCreate.mockResolvedValue(it("novo", "Soro", { kind: "procedure" }));
    await renderApp(<Novo />);
    await fill("Soro");
    await fireEvent.press(screen.getByRole("tab", { name: "Procedimento" }));
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith("/itens?tipo=procedure"));
    expect(mockCreate).toHaveBeenCalledWith({ name: "Soro", kind: "procedure" });
    expect(mockToast.success).toHaveBeenCalledWith("Salvo");
  });

  test("erro da API avisa e mantém o formulário preenchido", async () => {
    mockCreate.mockRejectedValue(new Error("Dados inválidos."));
    await renderApp(<Novo />);
    await fill();
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Dados inválidos."));
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Nome").props.value).toBe("Dipirona");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
  });
});
