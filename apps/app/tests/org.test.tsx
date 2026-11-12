import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/api/query";

const mockOrg = {
  inviteMember: jest.fn(),
  cancelInvitation: jest.fn(),
  getInvitation: jest.fn(),
  acceptInvitation: jest.fn(),
  setActive: jest.fn(),
};
const mockNotify = jest.fn();
jest.mock("@/lib/auth-client", () => ({
  authClient: {
    organization: {
      inviteMember: (a: unknown) => mockOrg.inviteMember(a),
      cancelInvitation: (a: unknown) => mockOrg.cancelInvitation(a),
      getInvitation: (a: unknown) => mockOrg.getInvitation(a),
      acceptInvitation: (a: unknown) => mockOrg.acceptInvitation(a),
      setActive: (a: unknown) => mockOrg.setActive(a),
    },
    $store: { notify: (s: string) => mockNotify(s) },
  },
}));
const mockRequest = jest.fn();
jest.mock("@/lib/api", () => ({ apiClient: { request: (...a: unknown[]) => mockRequest(...a) } }));
const mockStatus = { value: "signedIn" };
jest.mock("@/lib/session", () => ({ useAppSession: () => ({ status: mockStatus.value }) }));

import { acceptInvitation, cancelInvitation, getInvitation, inviteMember } from "@/lib/org";
import { useMe } from "@/lib/me-query";

beforeEach(() => {
  jest.clearAllMocks();
  mockStatus.value = "signedIn";
});
afterEach(() => queryClient.clear());

describe("inviteMember", () => {
  test("chama o cliente com e-mail e papel e devolve o id", async () => {
    mockOrg.inviteMember.mockResolvedValue({ data: { id: "inv1" }, error: null });
    expect(await inviteMember("ana@x.com", "admin")).toEqual({ id: "inv1" });
    expect(mockOrg.inviteMember).toHaveBeenCalledWith({ email: "ana@x.com", role: "admin" });
  });
  test("erro do servidor vira a mensagem do servidor", async () => {
    mockOrg.inviteMember.mockResolvedValue({ data: null, error: { message: "Usuário já é membro." } });
    await expect(inviteMember("a@x.com", "member")).rejects.toThrow("Usuário já é membro.");
  });
  test("erro sem mensagem usa a padrão do site", async () => {
    mockOrg.inviteMember.mockResolvedValue({ data: null, error: {} });
    await expect(inviteMember("a@x.com", "member")).rejects.toThrow("Não foi possível criar o convite.");
  });
});

describe("cancelInvitation", () => {
  test("cancela pelo id", async () => {
    mockOrg.cancelInvitation.mockResolvedValue({ data: {}, error: null });
    await cancelInvitation("inv1");
    expect(mockOrg.cancelInvitation).toHaveBeenCalledWith({ invitationId: "inv1" });
  });
  test("erro lança a mensagem padrão", async () => {
    mockOrg.cancelInvitation.mockResolvedValue({ data: null, error: { message: "x" } });
    await expect(cancelInvitation("inv1")).rejects.toThrow("Não foi possível cancelar o convite.");
  });
});

describe("getInvitation", () => {
  test("devolve os dados do convite", async () => {
    mockOrg.getInvitation.mockResolvedValue({ data: { status: "pending", organizationName: "Casa", inviterEmail: "d@x.com", extra: 1 }, error: null });
    expect(await getInvitation("inv1")).toEqual({ status: "pending", organizationName: "Casa", inviterEmail: "d@x.com" });
    expect(mockOrg.getInvitation).toHaveBeenCalledWith({ query: { id: "inv1" } });
  });
  test("erro da API ou ausência de dados viram null (convite não existe ou não é seu)", async () => {
    mockOrg.getInvitation.mockResolvedValueOnce({ data: null, error: { status: 404 } });
    expect(await getInvitation("x")).toBeNull();
    mockOrg.getInvitation.mockResolvedValueOnce({ data: null, error: null });
    expect(await getInvitation("x")).toBeNull();
  });
  test("falha de rede (exceção) NÃO vira null: sobe para a tela mostrar 'Tentar de novo'", async () => {
    mockOrg.getInvitation.mockRejectedValueOnce(new TypeError("Network request failed"));
    await expect(getInvitation("x")).rejects.toThrow("Network request failed");
  });
});

describe("acceptInvitation", () => {
  test("conta já cheia (limite de pessoas do plano grátis): mensagem do plano em português, e o código chega para o paywall", async () => {
    mockOrg.acceptInvitation.mockResolvedValue({ data: null, error: { code: "ORGANIZATION_MEMBERSHIP_LIMIT_REACHED", message: "Organization membership limit reached" } });
    const err = await acceptInvitation("inv1").catch((e) => e);
    expect(err.message).toBe("Esta conta já está com o número máximo de pessoas do plano grátis. Peça a quem convidou você para assinar o Medicron Plus.");
    expect(err.code).toBe("ORGANIZATION_MEMBERSHIP_LIMIT_REACHED");
  });

  test("aceita, ativa a conta, avisa a lista de contas e esvazia o cache da conta anterior (o usuário fica)", async () => {
    mockOrg.acceptInvitation.mockResolvedValue({ data: { invitation: { organizationId: "org9" } }, error: null });
    mockOrg.setActive.mockResolvedValue({ data: {}, error: null });
    queryClient.setQueryData(["patients"], [{ id: "da-conta-antiga" }]);
    queryClient.setQueryData(["me"], { user: { id: "u" } });
    expect(await acceptInvitation("inv1")).toEqual({ organizationId: "org9" });
    expect(mockOrg.acceptInvitation).toHaveBeenCalledWith({ invitationId: "inv1" });
    expect(mockOrg.setActive).toHaveBeenCalledWith({ organizationId: "org9" });
    expect(mockNotify).toHaveBeenCalledWith("$listOrg");
    expect(queryClient.getQueryData(["patients"])).toBeUndefined();
    expect(queryClient.getQueryData(["me"])).toBeDefined();
  });
  test("erro lança a mensagem do site e não ativa nada", async () => {
    mockOrg.acceptInvitation.mockResolvedValue({ data: null, error: { message: "x" } });
    await expect(acceptInvitation("inv1")).rejects.toThrow("Não foi possível aceitar o convite (talvez você já seja membro ou o convite seja de outro e-mail).");
    expect(mockOrg.setActive).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });
});

describe("useMe", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  test("consulta /me com sessão", async () => {
    mockRequest.mockResolvedValue({ user: { id: "u", name: "A", email: "a@x.com" }, orgId: "o", role: "owner" });
    const { result } = await renderHook(() => useMe(), { wrapper });
    await waitFor(() => expect(result.current.data?.role).toBe("owner"));
    expect(mockRequest).toHaveBeenCalledWith("GET", "/me");
  });
  test("sem sessão não consulta", async () => {
    mockStatus.value = "signedOut";
    await renderHook(() => useMe(), { wrapper });
    expect(mockRequest).not.toHaveBeenCalled();
  });
});
