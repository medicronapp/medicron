import { fireEvent, screen } from "@testing-library/react-native";
import { Linking } from "react-native";
import type { SubscriptionDto } from "@medicron/shared";
import { renderApp } from "./helpers";

const mockRouter = { push: jest.fn() };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));
const mockSub: { value: SubscriptionDto | null } = { value: null };
jest.mock("@/lib/subscription-queries", () => ({ useSubscription: () => ({ subscription: mockSub.value, isPlus: mockSub.value?.tier === "plus", limits: mockSub.value?.limits }) }));
jest.mock("@/lib/purchases", () => ({ manageUrl: () => "https://play.google.com/store/account/subscriptions", purchasesAvailable: true }));

import { PlusCard } from "@/components/plus-card";

const FREE: SubscriptionDto = { tier: "free", plusUntil: null, source: null, willRenew: false, limits: { patients: 2, members: 2, historyDays: 30 }, usage: { patients: 1, members: 2 } };
const PLUS = (over: Partial<SubscriptionDto> = {}): SubscriptionDto => ({ tier: "plus", plusUntil: "2027-03-15T12:00:00.000Z", source: "google", willRenew: true, limits: { patients: null, members: 8, historyDays: null }, usage: { patients: 5, members: 3 }, ...over });

beforeEach(() => { jest.clearAllMocks(); jest.spyOn(Linking, "openURL").mockResolvedValue(); });
afterEach(() => jest.restoreAllMocks());

test("sem dados ainda: não mostra o cartão (nada de piscar 'grátis')", async () => {
  mockSub.value = null;
  await renderApp(<PlusCard />);
  expect(screen.queryByText("Medicron Plus")).toBeNull();
});

test("grátis: plano, uso 'X de N' e botão 'Conhecer o Plus' que abre /plus", async () => {
  mockSub.value = FREE;
  await renderApp(<PlusCard />);
  expect(screen.getByText("Medicron Plus")).toBeOnTheScreen();
  expect(screen.getByText("Plano grátis")).toBeOnTheScreen();
  expect(screen.getByText("1 de 2 pacientes")).toBeOnTheScreen();
  expect(screen.getByText("2 de 2 pessoas na conta")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Conhecer o Plus" }));
  expect(mockRouter.push).toHaveBeenCalledWith("/plus");
});

test("Plus de loja: validade, 'renova automaticamente' e 'Gerenciar assinatura' (Ajustes da loja)", async () => {
  mockSub.value = PLUS();
  await renderApp(<PlusCard />);
  expect(screen.getByText("Ativo até 15/03/2027")).toBeOnTheScreen();
  expect(screen.getByText("Renova automaticamente")).toBeOnTheScreen();
  expect(screen.getByText("Pacientes ilimitados")).toBeOnTheScreen();
  expect(screen.getByText("3 de 8 pessoas na conta")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Gerenciar assinatura" }));
  expect(Linking.openURL).toHaveBeenCalledWith("https://play.google.com/store/account/subscriptions");
});

test("Plus que não renova (cancelado): diz que termina na data", async () => {
  mockSub.value = PLUS({ willRenew: false });
  await renderApp(<PlusCard />);
  expect(screen.getByText("Não renova: termina em 15/03/2027")).toBeOnTheScreen();
});

test("Plus manual (fundador/testador): sem 'Gerenciar assinatura' (não há assinatura na loja)", async () => {
  mockSub.value = PLUS({ source: "manual" });
  await renderApp(<PlusCard />);
  expect(screen.getByText("Concedido pela equipe do Medicron")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Gerenciar assinatura" })).toBeNull();
});
