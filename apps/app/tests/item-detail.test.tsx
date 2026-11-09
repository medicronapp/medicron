import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import type { ItemDto } from "@medicron/shared";
import { renderApp } from "./helpers";
import { ApiClientError } from "@/lib/api/errors";

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), dismissTo: jest.fn(), back: jest.fn(), setParams: jest.fn() };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => ({ id: "i1" }), Stack: () => null }));
jest.mock("@/components/ui/toast", () => ({ toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() }, Toaster: () => null }));

type Q = { data?: ItemDto; isPending: boolean; isError: boolean; error?: unknown; refetch: jest.Mock };
const mockItem: { value: Q } = { value: { isPending: true, isError: false, refetch: jest.fn() } };
const mockUpdate = jest.fn();
const mockArchive = jest.fn();
jest.mock("@/lib/item-queries", () => ({
  useItem: () => mockItem.value,
  useUpdateItem: () => ({ mutateAsync: (a: unknown) => mockUpdate(a) }),
  useArchiveItem: () => ({ mutateAsync: (a: unknown) => mockArchive(a) }),
}));

import { toast as mockToast } from "@/components/ui/toast";
import Detalhe from "@/app/(app)/itens/[id]";

const item = (o: Partial<ItemDto> = {}): ItemDto => ({ id: "i1", name: "Dipirona", kind: "medication", defaultDose: "1 cp", notes: null, createdAt: "2026-01-01T00:00:00.000Z", ...o });
const ready = (i = item()) => { mockItem.value = { data: i, isPending: false, isError: false, refetch: jest.fn() }; };

beforeEach(() => {
  jest.clearAllMocks();
  mockItem.value = { isPending: true, isError: false, refetch: jest.fn() };
});

describe("estados", () => {
  test("carregando mostra o esqueleto", async () => {
    await renderApp(<Detalhe />);
    expect(screen.getByLabelText("Carregando")).toBeOnTheScreen();
  });
  test("404 mostra 'Item não encontrado' e 'Ver itens' leva à lista", async () => {
    mockItem.value = { isPending: false, isError: true, error: new ApiClientError(404, "not_found", "x"), refetch: jest.fn() };
    await renderApp(<Detalhe />);
    expect(screen.getByText("Item não encontrado")).toBeOnTheScreen();
    expect(screen.getByText("Ele pode ter sido arquivado.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Ver itens" }));
    expect(mockRouter.dismissTo).toHaveBeenCalledWith("/itens");
  });
  test("outro erro mostra a tela de erro com 'Tentar de novo'", async () => {
    mockItem.value = { isPending: false, isError: true, error: new ApiClientError(500, "x", "x"), refetch: jest.fn() };
    await renderApp(<Detalhe />);
    await fireEvent.press(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(mockItem.value.refetch).toHaveBeenCalled();
  });
});

describe("com o item", () => {
  test("cabeçalho com o nome; voltar leva à lista do tipo do item", async () => {
    ready(item({ kind: "procedure", name: "Temperatura" }));
    await renderApp(<Detalhe />);
    expect(screen.getByRole("header", { name: "Temperatura" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Voltar" }));
    expect(mockRouter.dismissTo).toHaveBeenCalledWith("/itens?tipo=procedure");
  });

  test("editar envia o corpo e volta à lista do tipo salvo (trocar de tipo muda de aba)", async () => {
    mockUpdate.mockResolvedValue(item({ kind: "procedure" }));
    ready();
    await renderApp(<Detalhe />);
    expect(screen.getByLabelText("Nome").props.value).toBe("Dipirona");
    await fireEvent.press(screen.getByRole("tab", { name: "Procedimento" }));
    await fireEvent.changeText(screen.getByLabelText("Dose / instrução padrão"), "");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ id: "i1", body: { name: "Dipirona", kind: "procedure" } }));
    expect(mockToast.success).toHaveBeenCalledWith("Salvo");
    expect(mockRouter.dismissTo).toHaveBeenCalledWith("/itens?tipo=procedure");
  });

  test("erro do servidor avisa e mantém o formulário", async () => {
    mockUpdate.mockRejectedValue(new Error("Dados inválidos."));
    ready();
    await renderApp(<Detalhe />);
    await fireEvent.changeText(screen.getByLabelText("Nome"), "Outro nome");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Dados inválidos."));
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Nome").props.value).toBe("Outro nome");
  });
});

describe("arquivar", () => {
  const openSheet = async () => {
    await fireEvent.press(screen.getByRole("button", { name: "Arquivar item" }));
    await screen.findByText("Arquivar Dipirona?");
  };

  test("pede confirmação, executa uma vez com dois toques e volta à lista do tipo", async () => {
    mockArchive.mockResolvedValue(undefined);
    ready();
    await renderApp(<Detalhe />);
    await openSheet();
    expect(screen.getByText("O item some das listas e as rotinas que o usam são encerradas.")).toBeOnTheScreen();
    const b = screen.getByRole("button", { name: "Arquivar" });
    await fireEvent.press(b);
    await fireEvent.press(b);
    await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith("/itens?tipo=medication"));
    expect(mockArchive).toHaveBeenCalledTimes(1);
    expect(mockArchive).toHaveBeenCalledWith("i1");
  });

  test("erro ao arquivar mantém o sheet e avisa", async () => {
    mockArchive.mockRejectedValue(new Error("falhou"));
    ready();
    await renderApp(<Detalhe />);
    await openSheet();
    await fireEvent.press(screen.getByRole("button", { name: "Arquivar" }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("falhou"));
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    expect(screen.getByText("Arquivar Dipirona?")).toBeOnTheScreen();
  });

  test("cancelar fecha sem arquivar", async () => {
    ready();
    await renderApp(<Detalhe />);
    await openSheet();
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));
    expect(mockArchive).not.toHaveBeenCalled();
  });
});
