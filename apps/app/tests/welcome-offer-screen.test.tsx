import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";
import { renderApp } from "./helpers";

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter, Stack: () => null }));
jest.mock("@/components/ui/toast", () => ({ toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() }, Toaster: () => null }));
jest.mock("@/lib/me-query", () => ({ useMe: () => ({ data: { role: "owner", orgId: "o1" }, isPending: false }) }));
const mockAfter = jest.fn();
jest.mock("@/lib/subscription-queries", () => ({ afterPurchase: (...a: unknown[]) => mockAfter(...a) }));
const mockSeen = jest.fn();
jest.mock("@/lib/home-queries", () => ({ useMarkWelcomeOfferSeen: () => ({ mutate: (...a: unknown[]) => mockSeen(...a) }) }));
const mockPurchases = { getWelcomeOffer: jest.fn(), purchase: jest.fn(), restore: jest.fn() };
jest.mock("@/lib/purchases", () => ({
  getWelcomeOffer: (...a: unknown[]) => mockPurchases.getWelcomeOffer(...a),
  purchase: (...a: unknown[]) => mockPurchases.purchase(...a),
  restore: (...a: unknown[]) => mockPurchases.restore(...a),
}));

import { toast as mockToast } from "@/components/ui/toast";
import Oferta from "@/app/oferta-boas-vindas";

const WELCOME = {
  pkg: { id: "welcome:$rc_annual", priceString: "R$ 59,90", period: "year" as const, trial: null },
  priceString: "R$ 59,90", regularPriceString: "R$ 89,90", savingsPercent: 33,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPurchases.getWelcomeOffer.mockResolvedValue(WELCOME);
  mockPurchases.restore.mockResolvedValue(false);
  mockAfter.mockResolvedValue(true);
  jest.spyOn(Linking, "openURL").mockResolvedValue();
});

describe("oferta de boas-vindas", () => {
  test("mostra o preço de lançamento, o preço normal riscado, a economia e a regra de uma vez só", async () => {
    await renderApp(<Oferta />);
    expect(await screen.findByText("Oferta de boas-vindas")).toBeOnTheScreen();
    expect(screen.getByText("R$ 59,90")).toBeOnTheScreen();
    expect(screen.getByText("R$ 89,90")).toBeOnTheScreen();
    expect(screen.getByText("no primeiro ano")).toBeOnTheScreen();
    expect(screen.getByText("Economize 33%")).toBeOnTheScreen();
    expect(screen.getByText("Esta oferta não aparece de novo.")).toBeOnTheScreen();
    for (const t of ["Pacientes ilimitados", "Até 8 pessoas na conta", "Histórico completo"]) expect(screen.getByText(t)).toBeOnTheScreen();
  });

  test("diz a verdade sobre a renovação e o cancelamento (exigência da Apple)", async () => {
    await renderApp(<Oferta />);
    expect(await screen.findByText(/Depois do primeiro ano, renova por R\$ 89,90\/ano\. Cancele quando quiser nos Ajustes da App Store\./)).toBeOnTheScreen();
    expect(screen.getByRole("link", { name: "Termos de uso" })).toBeOnTheScreen();
    expect(screen.getByRole("link", { name: "Política de privacidade" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Restaurar compras" })).toBeOnTheScreen();
  });

  test("registra a exibição no servidor (a 'única vez') uma só vez, mesmo reaparecendo a tela", async () => {
    const { rerender } = await renderApp(<Oferta />);
    await screen.findByText("Oferta de boas-vindas");
    await waitFor(() => expect(mockSeen).toHaveBeenCalledTimes(1));
    rerender(<Oferta />);
    expect(mockSeen).toHaveBeenCalledTimes(1);
  });

  test("sem oferta disponível (null): fecha sozinha e NÃO queima a oferta", async () => {
    mockPurchases.getWelcomeOffer.mockResolvedValue(null);
    await renderApp(<Oferta />);
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(mockSeen).not.toHaveBeenCalled();
    expect(screen.queryByText("Oferta de boas-vindas")).toBeNull();
  });

  test("falha ao carregar (rede): fecha sozinha e NÃO queima a oferta", async () => {
    mockPurchases.getWelcomeOffer.mockRejectedValue(new Error("rede"));
    await renderApp(<Oferta />);
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(mockSeen).not.toHaveBeenCalled();
  });

  test("'Agora não' fecha a oferta sem comprar", async () => {
    await renderApp(<Oferta />);
    await fireEvent.press(await screen.findByRole("button", { name: "Agora não" }));
    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockPurchases.purchase).not.toHaveBeenCalled();
  });

  test("comprar: abre a compra da conta ativa, confirma o Plus, avisa e fecha", async () => {
    mockPurchases.purchase.mockResolvedValue("purchased");
    await renderApp(<Oferta />);
    await fireEvent.press(await screen.findByRole("button", { name: "Quero o Plus por R$ 59,90" }));
    await waitFor(() => expect(mockPurchases.purchase).toHaveBeenCalledWith(WELCOME.pkg, "o1"));
    expect(mockAfter).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalledWith("Medicron Plus ativado");
    expect(mockRouter.back).toHaveBeenCalled();
  });

  test("compra confirmada mas o servidor ainda não viu: avisa que ativa em instantes", async () => {
    mockPurchases.purchase.mockResolvedValue("purchased");
    mockAfter.mockResolvedValue(false);
    await renderApp(<Oferta />);
    await fireEvent.press(await screen.findByRole("button", { name: "Quero o Plus por R$ 59,90" }));
    await waitFor(() => expect(mockToast.info).toHaveBeenCalledWith("Compra concluída. O Plus será ativado em instantes."));
  });

  test("cancelar a folha da Apple mantém a oferta na tela, sem erro", async () => {
    mockPurchases.purchase.mockResolvedValue("cancelled");
    await renderApp(<Oferta />);
    await fireEvent.press(await screen.findByRole("button", { name: "Quero o Plus por R$ 59,90" }));
    await waitFor(() => expect(mockPurchases.purchase).toHaveBeenCalled());
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Quero o Plus por R$ 59,90" })).toBeEnabled();
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  test("erro na compra mostra a mensagem e libera o botão", async () => {
    mockPurchases.purchase.mockRejectedValue(new Error("Pagamento recusado"));
    await renderApp(<Oferta />);
    await fireEvent.press(await screen.findByRole("button", { name: "Quero o Plus por R$ 59,90" }));
    expect(await screen.findByText("Pagamento recusado")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Quero o Plus por R$ 59,90" })).toBeEnabled();
  });

  test("restaurar compras: com assinatura ativa confirma; sem, avisa", async () => {
    mockPurchases.restore.mockResolvedValueOnce(true);
    await renderApp(<Oferta />);
    await fireEvent.press(await screen.findByRole("button", { name: "Restaurar compras" }));
    await waitFor(() => expect(mockPurchases.restore).toHaveBeenCalledWith("o1"));
    expect(mockToast.success).toHaveBeenCalledWith("Assinatura restaurada");
    expect(mockRouter.back).toHaveBeenCalled();
  });

  test("sem número da economia (a loja não informou), não mostra 'Economize'", async () => {
    mockPurchases.getWelcomeOffer.mockResolvedValue({ ...WELCOME, savingsPercent: null });
    await renderApp(<Oferta />);
    await screen.findByText("Oferta de boas-vindas");
    expect(screen.queryByText(/Economize/)).toBeNull();
  });
});
