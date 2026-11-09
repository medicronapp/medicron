import { renderHook, act, waitFor } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { ApiClientError } from "@/lib/api/errors";
import { queryClient } from "@/lib/api/query";
import { fetchItems, fetchItem, createItem, updateItem, archiveItem } from "@/lib/api/items";
import { useItems, useItem, useCreateItem, useUpdateItem, useArchiveItem } from "@/lib/item-queries";

const mockRequest = jest.fn();
jest.mock("@/lib/api", () => ({ apiClient: { request: (...a: unknown[]) => mockRequest(...a) } }));
jest.mock("@/lib/session", () => ({ useAppSession: () => ({ status: "signedIn" }) }));

const fake = () => ({ request: jest.fn() });
const as = (c: ReturnType<typeof fake>) => c as unknown as Parameters<typeof fetchItems>[0];
const body = { name: "Dipirona", kind: "medication" as const };

beforeEach(() => mockRequest.mockReset());
afterEach(() => { jest.restoreAllMocks(); queryClient.clear(); queryClient.getMutationCache().clear(); });

describe("cliente", () => {
  test("fetchItems sem e com tipo", async () => {
    const c = fake();
    c.request.mockResolvedValue({ items: [{ id: "i" }] });
    expect(await fetchItems(as(c))).toEqual([{ id: "i" }]);
    expect(c.request).toHaveBeenLastCalledWith("GET", "/items");
    await fetchItems(as(c), "procedure");
    expect(c.request).toHaveBeenLastCalledWith("GET", "/items?kind=procedure");
  });
  test("fetchItem, createItem, updateItem desembrulham; archiveItem faz DELETE", async () => {
    const c = fake();
    c.request.mockResolvedValue({ item: { id: "i" } });
    expect(await fetchItem(as(c), "i")).toEqual({ id: "i" });
    expect(c.request).toHaveBeenLastCalledWith("GET", "/items/i");
    expect(await createItem(as(c), body)).toEqual({ id: "i" });
    expect(c.request).toHaveBeenLastCalledWith("POST", "/items", body);
    expect(await updateItem(as(c), "i", body)).toEqual({ id: "i" });
    expect(c.request).toHaveBeenLastCalledWith("PATCH", "/items/i", body);
    c.request.mockResolvedValue(undefined);
    await archiveItem(as(c), "i");
    expect(c.request).toHaveBeenLastCalledWith("DELETE", "/items/i");
  });
  test("404 propaga como ApiClientError", async () => {
    const c = fake();
    c.request.mockRejectedValue(new ApiClientError(404, "not_found", "Item não encontrado."));
    await expect(fetchItem(as(c), "x")).rejects.toBeInstanceOf(ApiClientError);
  });
});

describe("hooks e cache", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  const keys = (spy: jest.SpyInstance) => spy.mock.calls.map((c) => (c[0] as { queryKey: unknown[] }).queryKey[0]);

  test("useItems usa uma chave por tipo (e 'all' sem tipo)", async () => {
    mockRequest.mockResolvedValue({ items: [] });
    await renderHook(() => useItems("procedure"), { wrapper });
    await renderHook(() => useItems(), { wrapper });
    await waitFor(() => expect(queryClient.getQueryData(["items", "procedure"])).toEqual([]));
    await waitFor(() => expect(queryClient.getQueryData(["items", "all"])).toEqual([]));
  });

  test("criar item invalida todas as listas de itens (prefixo)", async () => {
    mockRequest.mockResolvedValue({ item: { id: "i" } });
    const spy = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = await renderHook(() => useCreateItem(), { wrapper });
    await act(async () => { await result.current.mutateAsync(body); });
    await waitFor(() => expect(keys(spy)).toContain("items"));
  });

  test("editar item invalida listas e detalhe", async () => {
    mockRequest.mockResolvedValue({ item: { id: "i" } });
    const spy = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = await renderHook(() => useUpdateItem(), { wrapper });
    await act(async () => { await result.current.mutateAsync({ id: "i", body }); });
    await waitFor(() => expect(keys(spy)).toEqual(expect.arrayContaining(["items", "item"])));
  });

  test("arquivar com a tela do item ainda montada: não volta a 'carregando' e não rebusca o item (nada de GET 404)", async () => {
    mockRequest.mockImplementation(async (method: string, path: string) => {
      if (method === "GET" && path === "/items/i") return { item: { id: "i", name: "X", kind: "medication" } };
      return undefined;
    });
    const { result } = await renderHook(() => ({ detail: useItem("i"), archive: useArchiveItem() }), { wrapper });
    await waitFor(() => expect(result.current.detail.data?.id).toBe("i"));
    mockRequest.mockClear();
    const pending: boolean[] = [];
    await act(async () => { await result.current.archive.mutateAsync("i"); pending.push(result.current.detail.isPending); });
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    pending.push(result.current.detail.isPending);
    expect(pending).toEqual([false, false]);
    expect(mockRequest.mock.calls.filter(([m, p]) => m === "GET" && p === "/items/i")).toHaveLength(0);
  });

  test("arquivar marca o detalhe como velho (sem rebuscar) e invalida itens, rotinas, pacientes e Hoje", async () => {
    mockRequest.mockResolvedValue(undefined);
    queryClient.setQueryData(["item", "i"], { id: "i" });
    const spy = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = await renderHook(() => useArchiveItem(), { wrapper });
    await act(async () => { await result.current.mutateAsync("i"); });
    await waitFor(() => expect(keys(spy)).toEqual(expect.arrayContaining(["items", "plans", "patients", "patient", "home"])));
    expect(queryClient.getQueryState(["item", "i"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryData(["item", "i"])).toEqual({ id: "i" }); // continua lá: nada de recriar uma consulta vazia
  });
});
