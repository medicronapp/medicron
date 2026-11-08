import { renderHook, act, waitFor } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { ApiClientError } from "@/lib/api/errors";
import { queryClient } from "@/lib/api/query";
import { fetchItems, fetchItem, createItem, updateItem, archiveItem } from "@/lib/api/items";
import { useItems, useCreateItem, useUpdateItem, useArchiveItem } from "@/lib/item-queries";

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

  test("arquivar remove o detalhe do cache e invalida itens, rotinas, pacientes e Hoje (sem rebuscar o detalhe)", async () => {
    mockRequest.mockResolvedValue(undefined);
    queryClient.setQueryData(["item", "i"], { id: "i" });
    const spy = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = await renderHook(() => useArchiveItem(), { wrapper });
    await act(async () => { await result.current.mutateAsync("i"); });
    await waitFor(() => expect(keys(spy)).toEqual(expect.arrayContaining(["items", "plans", "patients", "patient", "home"])));
    expect(keys(spy)).not.toContain("item");
    expect(queryClient.getQueryData(["item", "i"])).toBeUndefined();
  });
});
