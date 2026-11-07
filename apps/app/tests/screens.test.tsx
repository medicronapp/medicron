import { screen } from "@testing-library/react-native";
import { renderApp } from "./helpers";
import { queryClient } from "@/lib/api/query";

const mockRequest = jest.fn();
jest.mock("@/lib/api", () => ({ apiClient: { request: (...a: unknown[]) => mockRequest(...a) } }));

const mockStatus = { value: "signedIn" };
jest.mock("@/lib/session", () => ({ useAppSession: () => ({ status: mockStatus.value }) }));

import Hoje from "@/app/(app)/index";
import Pacientes from "@/app/(app)/pacientes";
import Itens from "@/app/(app)/itens";
import Conta from "@/app/(app)/conta";

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
  mockStatus.value = "signedIn";
});
afterAll(() => queryClient.clear());

test.each([["Hoje", Hoje], ["Pacientes", Pacientes], ["Itens", Itens]])("%s é provisória: 'Em construção'", async (_n, Screen) => {
  await renderApp(<Screen />);
  expect(screen.getByText("Em construção")).toBeOnTheScreen();
});

test("Conta mostra nome e e-mail vindos da API", async () => {
  mockRequest.mockResolvedValue({ user: { id: "u", name: "Maria Silva", email: "maria@x.com" }, orgId: "o1", role: "owner" });
  await renderApp(<Conta />);
  expect(await screen.findByText("maria@x.com")).toBeOnTheScreen();
  expect(screen.getByText("Maria Silva")).toBeOnTheScreen();
  expect(mockRequest).toHaveBeenCalledWith("GET", "/me");
});

test("Conta deslogada não pede /me (evita 401 a cada abertura)", async () => {
  mockStatus.value = "signedOut";
  await renderApp(<Conta />);
  expect(mockRequest).not.toHaveBeenCalled();
});
