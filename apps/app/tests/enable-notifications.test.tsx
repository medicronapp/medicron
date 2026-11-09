import { Linking } from "react-native";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderApp } from "./helpers";

type State = "unsupported" | "denied" | "default" | "enabled";
const mockPush = {
  state: "default" as State,
  enable: jest.fn(async (): Promise<"enabled" | "denied" | "no-project"> => "enabled"),
  disable: jest.fn(async () => {}),
};
jest.mock("@/lib/push", () => ({
  getPushState: jest.fn(async () => mockPush.state),
  enablePush: () => mockPush.enable(),
  disablePush: () => mockPush.disable(),
}));
jest.mock("@/components/ui/toast", () => ({ toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() }, Toaster: () => null }));

import { toast as mockToast } from "@/components/ui/toast";
import { EnableNotifications } from "@/components/enable-notifications";

beforeEach(() => {
  jest.clearAllMocks();
  mockPush.state = "default";
  mockPush.enable.mockResolvedValue("enabled");
});

describe("estados", () => {
  test("default: convite com o texto do site e o botão Ativar", async () => {
    await renderApp(<EnableNotifications />);
    expect(await screen.findByText("Receba avisos no celular")).toBeOnTheScreen();
    expect(screen.getByText("Um alerta na hora de cada medicação ou cuidado.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Ativar notificações" })).toBeOnTheScreen();
  });

  test("default também aparece no modo compacto", async () => {
    await renderApp(<EnableNotifications compact />);
    expect(await screen.findByText("Receba avisos no celular")).toBeOnTheScreen();
  });

  test("enabled (completo): 'Notificações ativadas' com Desativar", async () => {
    mockPush.state = "enabled";
    await renderApp(<EnableNotifications />);
    expect(await screen.findByText("Notificações ativadas")).toBeOnTheScreen();
    expect(screen.getByText("Você será avisado neste aparelho.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Desativar" })).toBeOnTheScreen();
  });

  test("enabled no modo compacto não renderiza nada", async () => {
    mockPush.state = "enabled";
    await renderApp(<EnableNotifications compact />);
    await waitFor(() => expect(require("@/lib/push").getPushState).toHaveBeenCalled());
    expect(screen.queryByText("Notificações ativadas")).toBeNull();
    expect(screen.queryByText("Receba avisos no celular")).toBeNull();
  });

  test("denied: explica e oferece 'Abrir configurações'", async () => {
    mockPush.state = "denied";
    const open = jest.spyOn(Linking, "openSettings").mockResolvedValue();
    await renderApp(<EnableNotifications />);
    expect(await screen.findByText("As notificações estão bloqueadas. Libere nas configurações do aparelho para receber os avisos.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Abrir configurações" }));
    expect(open).toHaveBeenCalledTimes(1);
    open.mockRestore();
  });

  test("unsupported e carregando não renderizam nada", async () => {
    mockPush.state = "unsupported";
    await renderApp(<EnableNotifications />);
    await waitFor(() => expect(require("@/lib/push").getPushState).toHaveBeenCalled());
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("ativar e desativar", () => {
  test("sucesso: avisa e passa para 'Notificações ativadas'", async () => {
    await renderApp(<EnableNotifications />);
    await fireEvent.press(await screen.findByRole("button", { name: "Ativar notificações" }));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith("Notificações ativadas neste aparelho"));
    expect(await screen.findByText("Notificações ativadas")).toBeOnTheScreen();
  });

  test("permissão negada troca para o estado bloqueado", async () => {
    mockPush.enable.mockResolvedValue("denied");
    await renderApp(<EnableNotifications />);
    await fireEvent.press(await screen.findByRole("button", { name: "Ativar notificações" }));
    expect(await screen.findByText(/As notificações estão bloqueadas/)).toBeOnTheScreen();
  });

  test("sem projectId: aviso claro e o cartão continua utilizável", async () => {
    mockPush.enable.mockResolvedValue("no-project");
    await renderApp(<EnableNotifications />);
    await fireEvent.press(await screen.findByRole("button", { name: "Ativar notificações" }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Notificações indisponíveis nesta versão do app."));
    expect(screen.getByRole("button", { name: "Ativar notificações" })).toBeEnabled();
  });

  test("erro de rede: aviso e o cartão continua utilizável", async () => {
    mockPush.enable.mockRejectedValue(new Error("rede"));
    await renderApp(<EnableNotifications />);
    await fireEvent.press(await screen.findByRole("button", { name: "Ativar notificações" }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Não foi possível ativar as notificações."));
    expect(screen.getByRole("button", { name: "Ativar notificações" })).toBeEnabled();
  });

  test("duplo toque em Ativar registra uma vez só", async () => {
    let finish: (v: "enabled") => void = () => {};
    mockPush.enable.mockReturnValue(new Promise((r) => { finish = r; }));
    await renderApp(<EnableNotifications />);
    const b = await screen.findByRole("button", { name: "Ativar notificações" });
    await fireEvent.press(b);
    await fireEvent.press(b);
    expect(mockPush.enable).toHaveBeenCalledTimes(1);
    finish("enabled");
    await screen.findByText("Notificações ativadas");
  });

  test("Desativar volta ao convite", async () => {
    mockPush.state = "enabled";
    await renderApp(<EnableNotifications />);
    await fireEvent.press(await screen.findByRole("button", { name: "Desativar" }));
    await waitFor(() => expect(mockPush.disable).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Receba avisos no celular")).toBeOnTheScreen();
  });
});
