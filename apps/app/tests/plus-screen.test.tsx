import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Linking, Platform } from "react-native";
import type { SubscriptionDto } from "@medicron/shared";
import { renderApp } from "./helpers";

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), dismissTo: jest.fn() };
const mockParams: { value: Record<string, string> } = { value: {} };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => mockParams.value, Stack: () => null }));
jest.mock("@/components/ui/toast", () => ({ toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() }, Toaster: () => null }));

const FREE: SubscriptionDto = { tier: "free", plusUntil: null, source: null, willRenew: false, limits: { patients: 2, members: 2, historyDays: 30 }, usage: { patients: 2, members: 1 } };
const PLUS: SubscriptionDto = { tier: "plus", plusUntil: "2027-03-15T12:00:00.000Z", source: "apple", willRenew: true, limits: { patients: null, members: 8, historyDays: null }, usage: { patients: 5, members: 3 } };
const mockSub: { value: SubscriptionDto | null } = { value: FREE };
const mockRole: { value: "owner" | "admin" | "member" } = { value: "owner" };
jest.mock("@/lib/me-query", () => ({ useMe: () => ({ data: { role: mockRole.value }, isPending: false }) }));
const mockAfter = jest.fn();
jest.mock("@/lib/subscription-queries", () => ({
  useSubscription: () => ({ subscription: mockSub.value, isPlus: mockSub.value?.tier === "plus", limits: mockSub.value?.limits, isPending: false, refetch: jest.fn() }),
  afterPurchase: (...a: unknown[]) => mockAfter(...a),
}));

const mockPurchases = {
  available: true,
  getOffer: jest.fn(), purchase: jest.fn(), restore: jest.fn(),
};
jest.mock("@/lib/purchases", () => ({
  get purchasesAvailable() { return mockPurchases.available; },
  getOffer: (...a: unknown[]) => mockPurchases.getOffer(...a),
  purchase: (...a: unknown[]) => mockPurchases.purchase(...a),
  restore: (...a: unknown[]) => mockPurchases.restore(...a),
  manageUrl: () => "https://apps.apple.com/account/subscriptions",
}));

import { toast as mockToast } from "@/components/ui/toast";
import Plus from "@/app/(app)/plus";

const OFFER = {
  monthly: { id: "$rc_monthly", priceString: "R$ 12,90", period: "month" as const, trial: null },
  annual: { id: "$rc_annual", priceString: "R$ 89,90", period: "year" as const, trial: { days: 7 } },
};

beforeEach(() => {
  jest.clearAllMocks();
  (Platform as { OS: string }).OS = "ios";
  mockSub.value = FREE; mockRole.value = "owner"; mockParams.value = {}; mockPurchases.available = true;
  mockPurchases.getOffer.mockResolvedValue(OFFER);
  mockPurchases.restore.mockResolvedValue(false);
  mockAfter.mockResolvedValue(true);
  jest.spyOn(Linking, "openURL").mockResolvedValue();
});
afterEach(() => { jest.restoreAllMocks(); });

describe("tela do Medicron Plus", () => {
  test("mostra o que o Plus inclui e o que continua grátis", async () => {
    await renderApp(<Plus />);
    expect(await screen.findByText("Medicron Plus")).toBeOnTheScreen();
    for (const t of ["Pacientes ilimitados", "Até 8 pessoas na conta", "Histórico completo"]) expect(screen.getByText(t)).toBeOnTheScreen();
    expect(screen.getByText(/Continuam grátis/)).toBeOnTheScreen();
    expect(screen.getByText(/lembretes, a tela Hoje, marcar doses e widgets/)).toBeOnTheScreen();
  });

  test("os preços e o teste vêm da loja: anual com 7 dias grátis em destaque e o texto das regras da Apple", async () => {
    await renderApp(<Plus />);
    expect(await screen.findByText("R$ 89,90 por ano")).toBeOnTheScreen();
    expect(screen.getByText("R$ 12,90 por mês")).toBeOnTheScreen();
    expect(screen.getByText(/7 dias grátis, depois R\$ 89,90\/ano\. Cancele quando quiser nos Ajustes da App Store\./)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Começar 7 dias grátis" })).toBeOnTheScreen();
  });

  test("sem teste na oferta, não fala em teste grátis e o botão é 'Assinar'", async () => {
    mockPurchases.getOffer.mockResolvedValue({ ...OFFER, annual: { ...OFFER.annual, trial: null } });
    await renderApp(<Plus />);
    expect(await screen.findByRole("button", { name: "Assinar" })).toBeOnTheScreen();
    expect(screen.queryByText(/dias grátis/)).toBeNull();
  });

  test("escolher o mensal troca o botão e o texto de renovação", async () => {
    await renderApp(<Plus />);
    await fireEvent.press(await screen.findByRole("radio", { name: /R\$ 12,90 por mês/ }));
    expect(screen.getByRole("button", { name: "Assinar" })).toBeOnTheScreen();
    expect(screen.getByText(/R\$ 12,90\/mês\. Cancele quando quiser/)).toBeOnTheScreen();
  });

  test("comprar: chama purchase com o plano escolhido, depois afterPurchase, avisa e volta", async () => {
    mockPurchases.purchase.mockResolvedValue("purchased");
    await renderApp(<Plus />);
    await fireEvent.press(await screen.findByRole("button", { name: "Começar 7 dias grátis" }));
    await waitFor(() => expect(mockAfter).toHaveBeenCalled());
    expect(mockPurchases.purchase).toHaveBeenCalledWith(OFFER.annual);
    expect(mockToast.success).toHaveBeenCalledWith("Medicron Plus ativado");
    expect(mockRouter.back).toHaveBeenCalled();
  });

  test("compra cancelada pelo usuário não mostra erro nem sincroniza", async () => {
    mockPurchases.purchase.mockResolvedValue("cancelled");
    await renderApp(<Plus />);
    await fireEvent.press(await screen.findByRole("button", { name: "Começar 7 dias grátis" }));
    await waitFor(() => expect(mockPurchases.purchase).toHaveBeenCalled());
    expect(mockToast.error).not.toHaveBeenCalled();
    expect(mockAfter).not.toHaveBeenCalled();
  });

  test("erro real na compra mostra a mensagem e deixa tentar de novo", async () => {
    mockPurchases.purchase.mockRejectedValue(new Error("Pagamento recusado"));
    await renderApp(<Plus />);
    await fireEvent.press(await screen.findByRole("button", { name: "Começar 7 dias grátis" }));
    expect(await screen.findByText("Pagamento recusado")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Começar 7 dias grátis" })).toBeOnTheScreen();
  });

  test("compra feita mas o Plus ainda não apareceu (webhook lento): avisa que ativa em instantes, sem erro", async () => {
    mockPurchases.purchase.mockResolvedValue("purchased");
    mockAfter.mockResolvedValue(false);
    await renderApp(<Plus />);
    await fireEvent.press(await screen.findByRole("button", { name: "Começar 7 dias grátis" }));
    await waitFor(() => expect(mockToast.info).toHaveBeenCalledWith("Compra concluída. O Plus será ativado em instantes."));
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  test("Restaurar compras: sem assinatura avisa; com assinatura sincroniza", async () => {
    await renderApp(<Plus />);
    await fireEvent.press(await screen.findByRole("button", { name: "Restaurar compras" }));
    await waitFor(() => expect(mockToast.info).toHaveBeenCalledWith("Nenhuma assinatura encontrada para restaurar."));
    mockPurchases.restore.mockResolvedValue(true);
    await fireEvent.press(screen.getByRole("button", { name: "Restaurar compras" }));
    await waitFor(() => expect(mockAfter).toHaveBeenCalled());
  });

  test("links de Termos de uso e Política de privacidade abrem as páginas do site", async () => {
    await renderApp(<Plus />);
    await fireEvent.press(await screen.findByRole("link", { name: "Termos de uso" }));
    expect(Linking.openURL).toHaveBeenCalledWith("https://medicron.com.br/termos");
    await fireEvent.press(screen.getByRole("link", { name: "Política de privacidade" }));
    expect(Linking.openURL).toHaveBeenCalledWith("https://medicron.com.br/privacidade");
  });

  test("motivo patients: explica o limite com o número", async () => {
    mockParams.value = { motivo: "patients" };
    await renderApp(<Plus />);
    expect(await screen.findByText("Você chegou ao limite de 2 pacientes do plano grátis.")).toBeOnTheScreen();
  });

  test("motivo members: explica o limite de pessoas com o número", async () => {
    mockParams.value = { motivo: "members" };
    await renderApp(<Plus />);
    expect(await screen.findByText("Você chegou ao limite de 2 pessoas na conta do plano grátis.")).toBeOnTheScreen();
  });

  test("conta que já é Plus não mostra motivo de limite (e nunca escreve 'null')", async () => {
    mockSub.value = PLUS;
    mockParams.value = { motivo: "patients" };
    await renderApp(<Plus />);
    expect(await screen.findByText(/Medicron Plus ativo/)).toBeOnTheScreen();
    expect(screen.queryByText(/limite de/)).toBeNull();
    expect(screen.queryByText(/null/)).toBeNull();
  });

  test("o histórico: motivo history", async () => {
    mockParams.value = { motivo: "history" };
    await renderApp(<Plus />);
    expect(await screen.findByText("O plano grátis mostra os últimos 30 dias do histórico.")).toBeOnTheScreen();
  });
});

describe("estados que não vendem", () => {
  test("web: orienta a assinar pelo celular e NÃO mostra nenhum botão de compra", async () => {
    (Platform as { OS: string }).OS = "web"; mockPurchases.available = false;
    await renderApp(<Plus />);
    expect(await screen.findByText("Assine pelo aplicativo no celular.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /Assinar|Começar/ })).toBeNull();
    expect(mockPurchases.getOffer).not.toHaveBeenCalled();
  });

  test("membro comum: 'Peça a quem administra a conta para assinar' e sem botão de compra", async () => {
    mockRole.value = "member";
    await renderApp(<Plus />);
    expect(await screen.findByText("Peça a quem administra a conta para assinar.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /Assinar|Começar/ })).toBeNull();
  });

  test("já é Plus: mostra a validade e 'Gerenciar assinatura' (abre os Ajustes da loja); sem botão de compra", async () => {
    mockSub.value = PLUS;
    await renderApp(<Plus />);
    expect(await screen.findByText(/Medicron Plus ativo/)).toBeOnTheScreen();
    expect(screen.getByText(/15\/03\/2027/)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /Assinar|Começar/ })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Gerenciar assinatura" }));
    expect(Linking.openURL).toHaveBeenCalledWith("https://apps.apple.com/account/subscriptions");
  });

  test("oferta indisponível ou erro de rede: mensagem e 'Tentar de novo'", async () => {
    mockPurchases.getOffer.mockRejectedValueOnce(new Error("rede")).mockResolvedValueOnce(OFFER);
    await renderApp(<Plus />);
    expect(await screen.findByText("Não foi possível carregar os planos.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("R$ 89,90 por ano")).toBeOnTheScreen();
  });
});
