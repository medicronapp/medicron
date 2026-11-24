import { Linking, Platform } from "react-native";
import { screen, fireEvent } from "@testing-library/react-native";
import { renderApp } from "./helpers";

jest.mock("expo-router", () => ({
  usePathname: () => "/",
  useRouter: () => ({ navigate: jest.fn(), push: jest.fn(), replace: jest.fn() }),
}));

import { SidebarNav } from "@/components/sidebar-nav";
import { APP_STORE_URL } from "@/lib/store-links";

const KEY = "medicron.promo.ios.dismissed";
let store: Record<string, string>;
const setOS = (os: string) => { (Platform as { OS: string }).OS = os; };

beforeEach(() => {
  store = {};
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; } },
  });
  jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
  setOS("web");
});
afterEach(() => { setOS("ios"); jest.restoreAllMocks(); });

describe("sugestão do app para iPhone na barra lateral", () => {
  test("na web: mostra a sugestão com o link da App Store", async () => {
    await renderApp(<SidebarNav />);
    expect(screen.getByText("Medicron no iPhone")).toBeOnTheScreen();
    expect(screen.getByText(/lembretes no celular/i)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Baixar na App Store" }));
    expect(Linking.openURL).toHaveBeenCalledWith(APP_STORE_URL);
  });

  test("o endereço é o da página do app na App Store (Brasil)", () => {
    expect(APP_STORE_URL).toBe("https://apps.apple.com/br/app/medicron/id6832577438");
  });

  test("no app nativo (iOS/Android) a sugestão não aparece", async () => {
    setOS("ios");
    await renderApp(<SidebarNav />);
    expect(screen.queryByText("Medicron no iPhone")).toBeNull();
    setOS("android");
    await renderApp(<SidebarNav />);
    expect(screen.queryByText("Medicron no iPhone")).toBeNull();
  });

  test("dispensar esconde a sugestão e lembra a escolha", async () => {
    await renderApp(<SidebarNav />);
    await fireEvent.press(screen.getByRole("button", { name: "Dispensar sugestão do app" }));
    expect(screen.queryByText("Medicron no iPhone")).toBeNull();
    expect(store[KEY]).toBe("1");
  });

  test("quem já dispensou antes não vê a sugestão de novo", async () => {
    store[KEY] = "1";
    await renderApp(<SidebarNav />);
    expect(screen.queryByText("Medicron no iPhone")).toBeNull();
  });

  test("se o navegador bloqueia o armazenamento, a sugestão aparece e dispensar ainda a esconde (nesta visita)", async () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("bloqueado"); } },
    });
    await renderApp(<SidebarNav />);
    expect(screen.getByText("Medicron no iPhone")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Dispensar sugestão do app" }));
    expect(screen.queryByText("Medicron no iPhone")).toBeNull();
  });

  test("os 4 itens de navegação continuam (a sugestão não é um deles)", async () => {
    await renderApp(<SidebarNav />);
    expect(screen.getAllByRole("button").filter((b) => ["Hoje", "Pacientes", "Itens", "Conta"].includes(String(b.props.accessibilityLabel)))).toHaveLength(4);
  });
});
