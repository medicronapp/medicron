import { screen, fireEvent, waitFor } from "@testing-library/react-native";
import { renderApp } from "./helpers";
import { isActive, NAV_ITEMS } from "@/lib/nav-items";
import { AppOutdatedError } from "@/lib/api/errors";
import { queryClient } from "@/lib/api/query";

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn() };
const mockNav = { pathname: "/" };
const mockSearch: { value: Record<string, string> } = { value: {} };
jest.mock("expo-router", () => ({
  usePathname: () => mockNav.pathname,
  useGlobalSearchParams: () => mockSearch.value,
  useRouter: () => mockRouter,
  Slot: () => null,
  Stack: () => {
    const { View } = require("react-native");
    return <View testID="stack" />;
  },
}));
jest.mock("@/components/ui/toast", () => ({ toast: { error: jest.fn() }, Toaster: () => null }));
// O gesture-handler real agenda, após o teste, uma ligação com o runtime de UI que só existe no aparelho.
jest.mock("react-native-gesture-handler", () => ({
  GestureHandlerRootView: ({ children }: { children?: unknown }) => children,
}));
const mockOrder: string[] = [];
jest.mock("@/lib/theme-pref", () => ({
  loadThemePref: jest.fn(async () => "dark"),
  applyThemePref: jest.fn((p: string) => { mockOrder.push(`apply:${p}`); }),
}));
jest.mock("expo-font", () => ({ useFonts: () => [true, null] }));
jest.mock("expo-splash-screen", () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn(() => { mockOrder.push("hide"); }) }));

const mockSession = {
  value: { status: "signedIn", orgCount: 2, activeOrgId: "o1", signOut: jest.fn(async () => {}) } as {
    status: string; orgCount: number; activeOrgId: string | null; signOut: () => Promise<void>;
  },
};
jest.mock("@/lib/session", () => ({ useAppSession: () => mockSession.value }));

const mockOrgs = { data: [{ id: "o1", name: "Casa da Vovó" }, { id: "o2", name: "Sítio" }] as { id: string; name: string }[] | null };
const mockSetActive = jest.fn(async (_args: unknown) => ({}));
jest.mock("@/lib/auth-client", () => ({
  authClient: {
    useListOrganizations: () => ({ data: mockOrgs.data, isPending: false }),
    organization: { setActive: (a: unknown) => mockSetActive(a) },
  },
}));

const mockRequest = jest.fn();
jest.mock("@/lib/api", () => ({ apiClient: { request: (...a: unknown[]) => mockRequest(...a) } }));

const mockWide = { value: false };
jest.mock("@/lib/use-breakpoint", () => ({ useIsWide: () => mockWide.value }));

import RootLayout from "@/app/_layout";
import AppLayout from "@/app/(app)/_layout";
import { TabBar } from "@/components/tab-bar";
import { SidebarNav } from "@/components/sidebar-nav";
import { AppHeader } from "@/components/app-header";

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
  mockNav.pathname = "/";
  mockSearch.value = {};
  mockWide.value = false;
  mockSession.value = { status: "signedIn", orgCount: 2, activeOrgId: "o1", signOut: jest.fn(async () => {}) };
  mockOrgs.data = [{ id: "o1", name: "Casa da Vovó" }, { id: "o2", name: "Sítio" }];
  mockRequest.mockResolvedValue({ user: { id: "u", name: "Maria Silva", email: "maria@x.com" }, orgId: "o1", role: "owner" });
});

// Sem isto, os temporizadores de coleta do cache seguram o Jest aberto.
afterAll(() => queryClient.clear());

describe("itens de navegação", () => {
  test("rótulos e rotas iguais às do site", () => {
    expect(NAV_ITEMS.map((i) => [i.label, i.href])).toEqual([
      ["Hoje", "/"], ["Pacientes", "/pacientes"], ["Itens", "/itens"], ["Conta", "/conta"],
    ]);
  });
  test("isActive casa por segmento; a raiz só casa exata", () => {
    expect(isActive("/pacientes/abc", "/pacientes")).toBe(true);
    expect(isActive("/pacientesx", "/pacientes")).toBe(false);
    expect(isActive("/pacientes", "/")).toBe(false);
    expect(isActive("/", "/")).toBe(true);
  });
});

describe("TabBar", () => {
  test("marca o item ativo e navega ao tocar", async () => {
    mockNav.pathname = "/pacientes/abc";
    await renderApp(<TabBar />);
    expect(screen.getByRole("button", { name: "Pacientes" })).toBeSelected();
    expect(screen.getByRole("button", { name: "Hoje" })).not.toBeSelected();
    await fireEvent.press(screen.getByRole("button", { name: "Itens" }));
    // navigate (e não push): tocar na aba volta à rota que já está na pilha, em vez de empilhar telas duplicadas.
    expect(mockRouter.navigate).toHaveBeenCalledWith("/itens");
    expect(mockRouter.push).not.toHaveBeenCalledWith("/itens");
  });
});

describe("SidebarNav", () => {
  test("mostra a marca e os 4 itens, com o ativo marcado", async () => {
    mockNav.pathname = "/conta";
    await renderApp(<SidebarNav />);
    expect(screen.getByText("Medicron")).toBeOnTheScreen();
    expect(screen.getAllByRole("button")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Conta" })).toBeSelected();
  });
});

describe("AppHeader", () => {
  test("mostra a conta ativa; tocar abre a lista de contas e escolher troca a conta", async () => {
    await renderApp(<AppHeader />);
    const trigger = screen.getByRole("button", { name: "Conta ativa: Casa da Vovó" });
    await fireEvent.press(trigger);
    await fireEvent.press(screen.getByRole("button", { name: "Sítio" }));
    expect(mockSetActive).toHaveBeenCalledWith({ organizationId: "o2" });
  });
  test("'Nova conta…' leva a /nova-conta", async () => {
    await renderApp(<AppHeader />);
    await fireEvent.press(screen.getByRole("button", { name: "Conta ativa: Casa da Vovó" }));
    await fireEvent.press(screen.getByRole("button", { name: "Nova conta…" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/nova-conta");
  });
  test("sem conta ativa na sessão, usa a que a API informa (orgId de /me)", async () => {
    mockSession.value = { ...mockSession.value, activeOrgId: null };
    await renderApp(<AppHeader />);
    expect(await screen.findByRole("button", { name: "Conta ativa: Casa da Vovó" })).toBeOnTheScreen();
  });
  test("menu do usuário: 'Minha conta' vai a /conta e 'Sair' sai e leva a /entrar", async () => {
    await renderApp(<AppHeader />);
    await fireEvent.press(await screen.findByRole("button", { name: "Menu do usuário" }));
    await fireEvent.press(screen.getByRole("button", { name: "Minha conta" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/conta");
    await fireEvent.press(screen.getByRole("button", { name: "Menu do usuário" }));
    await fireEvent.press(screen.getByRole("button", { name: "Sair" }));
    await waitFor(() => expect(mockSession.value.signOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/entrar"));
  });
});

describe("layout do grupo (app)", () => {
  test("em celular usa a barra de abas; sem barra lateral", async () => {
    await renderApp(<AppLayout />);
    expect(screen.getAllByRole("button", { name: "Hoje" })).toHaveLength(1);
    expect(screen.queryByText("Medicron")).toBeNull();
  });
  test("a partir de 768 px usa a barra lateral e não a de abas", async () => {
    mockWide.value = true;
    await renderApp(<AppLayout />);
    expect(screen.getByText("Medicron")).toBeOnTheScreen();
    expect(screen.getAllByRole("button", { name: "Hoje" })).toHaveLength(1);
    expect(screen.queryByTestId("tab-bar")).toBeNull();
    expect(screen.getByTestId("sidebar-nav")).toBeOnTheScreen();
  });
});

describe("troca de conta", () => {
  test("setActive com erro avisa com toast e não invalida os dados", async () => {
    mockSetActive.mockResolvedValueOnce({ error: { message: "x" } } as never);
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    await renderApp(<AppHeader />);
    await fireEvent.press(screen.getByRole("button", { name: "Conta ativa: Casa da Vovó" }));
    await fireEvent.press(screen.getByRole("button", { name: "Sítio" }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { toast } = require("@/components/ui/toast");
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Não foi possível trocar de conta."));
    expect(invalidate).not.toHaveBeenCalled();
  });
  test("trocar de conta remove do cache os dados da conta anterior (não só marca como velhos)", async () => {
    queryClient.setQueryData(["patients"], [{ id: "da-conta-antiga" }]);
    queryClient.setQueryData(["home", "today"], { velho: true });
    await renderApp(<AppHeader />);
    await fireEvent.press(screen.getByRole("button", { name: "Conta ativa: Casa da Vovó" }));
    await fireEvent.press(screen.getByRole("button", { name: "Sítio" }));
    await waitFor(() => expect(mockSetActive).toHaveBeenCalled());
    await waitFor(() => expect(queryClient.getQueryData(["patients"])).toBeUndefined());
    expect(queryClient.getQueryData(["home", "today"])).toBeUndefined();
  });
  test("deslogado, o cabeçalho não pede /me", async () => {
    mockSession.value = { status: "signedOut", orgCount: 0, activeOrgId: null, signOut: jest.fn() };
    await renderApp(<AppHeader />);
    expect(mockRequest).not.toHaveBeenCalled();
  });
});

const flat = (style: unknown) => [style].flat(Infinity).filter(Boolean).reduce<Record<string, number | string | undefined>>((a, b) => ({ ...a, ...(b as object) }), {});

describe("layout do grupo: o conteúdo rola até encostar no cabeçalho e nas abas", () => {
  test("a área de conteúdo não tem padding: não sobra faixa entre o conteúdo e o cabeçalho/abas", async () => {
    await renderApp(<AppLayout />);
    const style = flat(screen.getByTestId("content").props.style);
    expect(style.paddingTop ?? 0).toBe(0);
    expect(style.paddingBottom ?? 0).toBe(0);
  });
});

describe("Screen (corpo rolável)", () => {
  const { Screen } = require("@/components/screen");
  const { Text: RNText } = require("react-native");

  test("no celular a folga fica dentro da rolagem (topo 24, base cobre a barra de abas)", async () => {
    await renderApp(<Screen testID="sc"><RNText>x</RNText></Screen>);
    const style = flat(screen.getByTestId("sc").props.contentContainerStyle);
    expect(style.paddingTop).toBe(24);
    expect(Number(style.paddingBottom)).toBeGreaterThanOrEqual(96);
  });

  test("em tela larga (sem barra de abas) a folga de baixo é menor", async () => {
    mockWide.value = true;
    await renderApp(<Screen testID="sc"><RNText>x</RNText></Screen>);
    const style = flat(screen.getByTestId("sc").props.contentContainerStyle);
    expect(style.paddingTop).toBe(24);
    expect(Number(style.paddingBottom)).toBeLessThan(96);
  });
});

describe("layout raiz: tema", () => {
  test("a preferência de tema é aplicada antes de a tela de abertura sumir", async () => {
    mockOrder.length = 0;
    await renderApp(<RootLayout />);
    await waitFor(() => expect(mockOrder).toContain("hide"));
    expect(mockOrder).toEqual(["apply:dark", "hide"]);
  });
});

describe("layout raiz: destino guardado (next)", () => {
  test("logado numa tela de acesso, o Gate leva ao destino de `next` (usePathname não traz a query)", async () => {
    mockNav.pathname = "/cadastrar";
    mockSearch.value = { next: "/convite/abc" };
    mockSession.value = { status: "signedIn", orgCount: 0, activeOrgId: null, signOut: jest.fn() };
    await renderApp(<RootLayout />);
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/convite/abc"));
  });
});

describe("layout raiz", () => {
  test("sem sessão em rota protegida redireciona para /entrar com o destino", async () => {
    mockSession.value = { status: "signedOut", orgCount: 0, activeOrgId: null, signOut: jest.fn() };
    mockNav.pathname = "/pacientes";
    await renderApp(<RootLayout />);
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/entrar?next=%2Fpacientes"));
  });
  test("não mostra a casca enquanto a sessão carrega nem enquanto o redirecionamento está pendente", async () => {
    mockSession.value = { status: "loading", orgCount: 0, activeOrgId: null, signOut: jest.fn() };
    await renderApp(<RootLayout />);
    expect(screen.queryByTestId("stack")).toBeNull();
    mockSession.value = { status: "signedOut", orgCount: 0, activeOrgId: null, signOut: jest.fn() };
    mockNav.pathname = "/";
    await renderApp(<RootLayout />);
    expect(screen.queryByTestId("stack")).toBeNull();
  });
  test("logado na rota certa mostra a casca", async () => {
    await renderApp(<RootLayout />);
    expect(screen.getByTestId("stack")).toBeOnTheScreen();
  });
  test("erro ao carregar as contas mostra tela de erro e tenta de novo ao tocar", async () => {
    const retry = jest.fn();
    mockSession.value = { status: "error", orgCount: 0, activeOrgId: null, signOut: jest.fn(), retry } as never;
    await renderApp(<RootLayout />);
    expect(screen.getByText("Não foi possível carregar suas contas")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
  test("enquanto a sessão carrega não redireciona", async () => {
    mockSession.value = { status: "loading", orgCount: 0, activeOrgId: null, signOut: jest.fn() };
    mockNav.pathname = "/pacientes";
    await renderApp(<RootLayout />);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
  test("se a API exige app novo, mostra a tela de atualização e tenta uma só vez", async () => {
    mockRequest.mockRejectedValue(new AppOutdatedError("2.0.0"));
    await renderApp(<RootLayout />);
    expect(await screen.findByText("Atualize o app para continuar")).toBeOnTheScreen();
    expect(screen.getByText(/2\.0\.0/)).toBeOnTheScreen();
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});
