import { screen, fireEvent, waitFor } from "@testing-library/react-native";
import { renderApp } from "./helpers";
import { isActive, NAV_ITEMS } from "@/lib/nav-items";
import { AppOutdatedError } from "@/lib/api/errors";
import { queryClient } from "@/lib/api/query";

const mockRouter = { push: jest.fn(), replace: jest.fn() };
const mockNav = { pathname: "/" };
jest.mock("expo-router", () => ({
  usePathname: () => mockNav.pathname,
  useRouter: () => mockRouter,
  Slot: () => null,
  Stack: () => null,
}));
// O gesture-handler real agenda, após o teste, uma ligação com o runtime de UI que só existe no aparelho.
jest.mock("react-native-gesture-handler", () => ({
  GestureHandlerRootView: ({ children }: { children?: unknown }) => children,
}));
jest.mock("expo-font", () => ({ useFonts: () => [true, null] }));
jest.mock("expo-splash-screen", () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() }));

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
    expect(mockRouter.push).toHaveBeenCalledWith("/itens");
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

describe("layout raiz", () => {
  test("sem sessão em rota protegida redireciona para /entrar com o destino", async () => {
    mockSession.value = { status: "signedOut", orgCount: 0, activeOrgId: null, signOut: jest.fn() };
    mockNav.pathname = "/pacientes";
    await renderApp(<RootLayout />);
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/entrar?next=%2Fpacientes"));
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
