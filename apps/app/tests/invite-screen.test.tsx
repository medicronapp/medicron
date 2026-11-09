import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderApp } from "./helpers";
import { queryClient } from "@/lib/api/query";

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), dismissTo: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => ({ id: "inv1" }) }));
const mockSession = { value: { status: "signedIn", orgCount: 0 } };
jest.mock("@/lib/session", () => ({ useAppSession: () => mockSession.value }));
const mockGet = jest.fn();
const mockAccept = jest.fn();
jest.mock("@/lib/org", () => ({
  getInvitation: (...a: unknown[]) => mockGet(...a),
  acceptInvitation: (...a: unknown[]) => mockAccept(...a),
}));

import Convite from "@/app/convite/[id]";

const valid = { status: "pending", organizationName: "Casa da Vovó", inviterEmail: "thiago@x.com" };

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
  mockSession.value = { status: "signedIn", orgCount: 0 };
});
afterAll(() => queryClient.clear());

test("carregando mostra o esqueleto", async () => {
  mockGet.mockReturnValue(new Promise(() => {}));
  await renderApp(<Convite />);
  expect(screen.getByLabelText("Carregando")).toBeOnTheScreen();
});

test.each([
  ["inexistente", null],
  ["expirado", { ...valid, status: "expired" }],
  ["já usado", { ...valid, status: "accepted" }],
  ["cancelado", { ...valid, status: "canceled" }],
])("convite %s: 'Convite indisponível' com o texto do site e sem botão de aceitar", async (_n, info) => {
  mockGet.mockResolvedValue(info);
  await renderApp(<Convite />);
  expect(await screen.findByRole("header", { name: "Convite indisponível" })).toBeOnTheScreen();
  expect(screen.getByText("Este convite expirou, foi cancelado, já foi usado ou é para outro e-mail. Peça um novo link a quem convidou.")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Aceitar convite" })).toBeNull();
});

test("convite válido: título e texto do site com a conta e quem convidou", async () => {
  mockGet.mockResolvedValue(valid);
  await renderApp(<Convite />);
  expect(await screen.findByRole("header", { name: "Entrar em Casa da Vovó" })).toBeOnTheScreen();
  expect(screen.getByText("thiago@x.com convidou você para cuidar dos pacientes juntos.")).toBeOnTheScreen();
  expect(mockGet).toHaveBeenCalledWith("inv1");
});

test("aceitar chama a API uma vez (dois toques) e só vai para a Hoje quando a lista de contas já tem a conta", async () => {
  mockGet.mockResolvedValue(valid);
  mockAccept.mockResolvedValue({ organizationId: "org9" });
  const { rerender } = await renderApp(<Convite />);
  const b = await screen.findByRole("button", { name: "Aceitar convite" });
  await fireEvent.press(b);
  await fireEvent.press(b);
  await waitFor(() => expect(mockAccept).toHaveBeenCalledWith("inv1"));
  expect(mockAccept).toHaveBeenCalledTimes(1);
  expect(mockRouter.replace).not.toHaveBeenCalled(); // a lista de contas ainda é a velha (0 contas)
  mockSession.value = { status: "signedIn", orgCount: 1 };
  await rerender(<Convite />);
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/"));
});

const SITE_ERROR = "Não foi possível aceitar o convite (talvez você já seja membro ou o convite seja de outro e-mail).";

test("erro sem mensagem usa a do site", async () => {
  mockGet.mockResolvedValue(valid);
  mockAccept.mockRejectedValue(new Error(""));
  await renderApp(<Convite />);
  await fireEvent.press(await screen.findByRole("button", { name: "Aceitar convite" }));
  expect(await screen.findByText(SITE_ERROR)).toBeOnTheScreen();
});

test("erro ao aceitar mostra a mensagem do site e destrava o botão", async () => {
  mockGet.mockResolvedValue(valid);
  mockAccept.mockRejectedValue(new Error(SITE_ERROR));
  await renderApp(<Convite />);
  await fireEvent.press(await screen.findByRole("button", { name: "Aceitar convite" }));
  expect(await screen.findByText("Não foi possível aceitar o convite (talvez você já seja membro ou o convite seja de outro e-mail).")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Aceitar convite" })).toBeEnabled();
  expect(mockRouter.replace).not.toHaveBeenCalled();
});
