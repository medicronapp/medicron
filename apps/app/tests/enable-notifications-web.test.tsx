import { Platform } from "react-native";
import { screen } from "@testing-library/react-native";
import { renderApp } from "./helpers";

const mockPush = { state: "needs-install" as string };
jest.mock("@/lib/push", () => ({
  getPushState: jest.fn(async () => mockPush.state),
  enablePush: jest.fn(),
  disablePush: jest.fn(),
}));
jest.mock("@/components/ui/toast", () => ({ toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() }, Toaster: () => null }));

import { EnableNotifications } from "@/components/enable-notifications";

const original = Platform.OS;
beforeAll(() => { Object.defineProperty(Platform, "OS", { get: () => "web", configurable: true }); });
afterAll(() => { Object.defineProperty(Platform, "OS", { get: () => original, configurable: true }); });

test("iPhone fora da tela de início: orienta a adicionar o app", async () => {
  mockPush.state = "needs-install";
  await renderApp(<EnableNotifications />);
  expect(await screen.findByText(/No iPhone, para receber avisos: toque em Compartilhar → Adicionar à Tela de Início e abra o Medicron por lá\./)).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Ativar notificações" })).toBeNull();
});

test("bloqueado na web: fala do navegador e não oferece 'Abrir configurações'", async () => {
  mockPush.state = "denied";
  await renderApp(<EnableNotifications />);
  expect(await screen.findByText("As notificações estão bloqueadas. Libere nas configurações do navegador para receber os avisos.")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Abrir configurações" })).toBeNull();
});
