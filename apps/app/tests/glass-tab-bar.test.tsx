import { AccessibilityInfo, Platform } from "react-native";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderApp } from "./helpers";

const mockGlass = { available: true };
jest.mock("expo-glass-effect", () => {
  const { View: MockView } = require("react-native");
  const React = require("react");
  return {
    isLiquidGlassAvailable: () => mockGlass.available,
    GlassView: (props: Record<string, unknown>) => React.createElement(MockView, { testID: "glass-view", ...props }),
    GlassContainer: (props: Record<string, unknown>) => React.createElement(MockView, { testID: "glass-container", ...props }),
  };
});
const mockRouter = { navigate: jest.fn() };
const mockNav = { pathname: "/" };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter, usePathname: () => mockNav.pathname }));

import { TabBar } from "@/components/tab-bar";

const setPlatform = (os: string) => Object.defineProperty(Platform, "OS", { get: () => os, configurable: true });
const original = Platform.OS;
afterAll(() => setPlatform(original));
beforeEach(() => {
  jest.clearAllMocks();
  mockGlass.available = true;
  mockNav.pathname = "/pacientes";
  setPlatform("ios");
  jest.spyOn(AccessibilityInfo, "isReduceTransparencyEnabled").mockResolvedValue(false);
});

test("iOS com liquid glass: painel flutuante de vidro, com os 4 itens e o ativo marcado", async () => {
  await renderApp(<TabBar />);
  expect(await screen.findByTestId("glass-view")).toBeOnTheScreen();
  expect(screen.getByTestId("tab-bar")).toHaveProp("accessibilityRole", "tablist");
  expect(screen.getAllByRole("button")).toHaveLength(4);
  expect(screen.getByRole("button", { name: "Pacientes" })).toBeSelected();
  await fireEvent.press(screen.getByRole("button", { name: "Itens" }));
  expect(mockRouter.navigate).toHaveBeenCalledWith("/itens");
});

test("o vidro é um painel arredondado e interativo, afastado das bordas (flutuante)", async () => {
  await renderApp(<TabBar />);
  const glass = await screen.findByTestId("glass-view");
  expect(glass.props.isInteractive).toBe(true);
  expect(glass.props.glassEffectStyle).toBe("regular");
  const flat = Object.assign({}, ...[glass.props.style].flat(Infinity).filter(Boolean));
  expect(flat.borderRadius).toBeGreaterThanOrEqual(28);
});

test.each([
  ["sem liquid glass (iOS antigo ou build sem o SDK novo)", () => { mockGlass.available = false; }],
  ["Android", () => setPlatform("android")],
  ["web", () => setPlatform("web")],
])("%s: mantém a barra de hoje, sem vidro", async (_n, arrange) => {
  arrange();
  await renderApp(<TabBar />);
  expect(screen.getByTestId("tab-bar")).toBeOnTheScreen();
  expect(screen.queryByTestId("glass-view")).toBeNull();
  expect(screen.getAllByRole("button")).toHaveLength(4);
});

test("com 'Reduzir transparência' ligado, não usa vidro", async () => {
  (AccessibilityInfo.isReduceTransparencyEnabled as jest.Mock).mockResolvedValue(true);
  await renderApp(<TabBar />);
  await waitFor(() => expect(screen.queryByTestId("glass-view")).toBeNull());
  expect(screen.getAllByRole("button")).toHaveLength(4);
});

test("sem piscar: enquanto 'Reduzir transparência' não responde, não mostra a barra sólida para trocar pelo vidro depois", async () => {
  (AccessibilityInfo.isReduceTransparencyEnabled as jest.Mock).mockReturnValue(new Promise(() => {}));
  await renderApp(<TabBar />);
  expect(screen.queryByTestId("tab-bar")).toBeNull();
});

test("sem liquid glass disponível, a barra de sempre aparece na hora (não espera nada)", async () => {
  mockGlass.available = false;
  (AccessibilityInfo.isReduceTransparencyEnabled as jest.Mock).mockReturnValue(new Promise(() => {}));
  await renderApp(<TabBar />);
  expect(screen.getByTestId("tab-bar")).toBeOnTheScreen();
});
