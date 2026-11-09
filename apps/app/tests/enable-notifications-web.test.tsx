import { Platform } from "react-native";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderApp } from "./helpers";

const mockPush = { state: "needs-install" as string, disable: jest.fn(async () => {}), enable: jest.fn(async (): Promise<string> => "enabled") };
jest.mock("@/lib/push", () => ({
  getPushState: jest.fn(async () => mockPush.state),
  enablePush: () => mockPush.enable(),
  disablePush: () => mockPush.disable(),
}));
jest.mock("@/components/ui/toast", () => ({ toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() }, Toaster: () => null }));

import { toast as mockToast } from "@/components/ui/toast";
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

test("desativar falhando (offline) avisa e continua ativado", async () => {
  mockPush.state = "enabled";
  mockPush.disable.mockRejectedValueOnce(new Error("offline"));
  await renderApp(<EnableNotifications />);
  await fireEvent.press(await screen.findByRole("button", { name: "Desativar" }));
  await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Não foi possível desativar agora. Tente de novo."));
  expect(screen.getByText("Notificações ativadas")).toBeOnTheScreen();
});

test("sem a chave VAPID na web: a mensagem fala do site, não da versão do app", async () => {
  mockPush.state = "default";
  mockPush.enable.mockResolvedValueOnce("no-project");
  await renderApp(<EnableNotifications />);
  await fireEvent.press(await screen.findByRole("button", { name: "Ativar notificações" }));
  await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Notificações indisponíveis neste site."));
});
