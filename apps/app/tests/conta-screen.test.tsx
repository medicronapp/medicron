import { Platform } from "react-native";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { renderApp } from "./helpers";

jest.mock("expo-secure-store", () => ({ getItemAsync: jest.fn(async () => null), setItemAsync: jest.fn(async () => {}) }));
jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn(async () => true) }));
jest.mock("@/components/ui/toast", () => ({ toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() }, Toaster: () => null }));
jest.mock("@/lib/push", () => ({ getPushState: jest.fn(async () => "default"), enablePush: jest.fn(), disablePush: jest.fn() }));
jest.mock("@/components/delete-account", () => ({ DeleteAccount: () => { const { Text } = require("react-native"); const React = require("react"); return React.createElement(Text, null, "Cartão excluir conta"); } }));
jest.mock("@/lib/api-url", () => ({ API_URL: "https://medicron.com.br", inviteBase: () => "https://medicron.com.br" }));

type Org = { name: string; members: { id: string; role: string; user: { name: string; email: string } }[]; invitations: { id: string; email: string; status: string }[] };
type OrgQ = { data?: Org | null; isPending: boolean; error?: unknown; refetch: jest.Mock };
const mockOrg: { value: OrgQ } = { value: { isPending: true, refetch: jest.fn() } };
type MeQ = { data?: { role: string }; isPending: boolean; isError: boolean; refetch: jest.Mock };
const mockMe: { value: MeQ } = { value: { isPending: true, isError: false, refetch: jest.fn() } };
jest.mock("@/lib/org", () => ({
  useActiveOrganization: () => mockOrg.value,
  inviteMember: jest.fn(),
  cancelInvitation: jest.fn(),
}));
jest.mock("@/lib/me-query", () => ({ useMe: () => mockMe.value }));

import Conta from "@/app/(app)/conta";

const org = (o: Partial<Org> = {}): Org => ({
  name: "Casa da Vovó",
  members: [
    { id: "m1", role: "owner", user: { name: "Thiago Sciotta", email: "t@x.com" } },
    { id: "m2", role: "member", user: { name: "Ana Souza", email: "a@x.com" } },
  ],
  invitations: [],
  ...o,
});
const ready = (o: Org, role: string) => {
  mockOrg.value = { data: o, isPending: false, refetch: jest.fn() };
  mockMe.value = { data: { role }, isPending: false, isError: false, refetch: jest.fn() };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockOrg.value = { isPending: true, refetch: jest.fn() };
  mockMe.value = { isPending: true, isError: false, refetch: jest.fn() };
});

test("título é o nome da conta, com a descrição do site", async () => {
  ready(org(), "owner");
  await renderApp(<Conta />);
  expect(screen.getByRole("header", { name: "Casa da Vovó" })).toBeOnTheScreen();
  expect(screen.getByText("Pessoas, convites e preferências desta conta.")).toBeOnTheScreen();
});

test("lista as pessoas com os papéis", async () => {
  ready(org(), "owner");
  await renderApp(<Conta />);
  expect(screen.getByText("Pessoas nesta conta")).toBeOnTheScreen();
  expect(screen.getByText("Todas veem e registram os mesmos cuidados.")).toBeOnTheScreen();
  expect(screen.getByText("Thiago Sciotta")).toBeOnTheScreen();
  expect(screen.getByText("Dono")).toBeOnTheScreen();
  expect(screen.getByText("Ana Souza")).toBeOnTheScreen();
  expect(screen.getByText("Membro")).toBeOnTheScreen();
});

test.each(["owner", "admin"])("%s vê 'Convidar alguém' e os convites pendentes (só os pendentes)", async (role) => {
  ready(org({ invitations: [{ id: "i1", email: "pend@x.com", status: "pending" }, { id: "i2", email: "aceito@x.com", status: "accepted" }] }), role);
  await renderApp(<Conta />);
  expect(screen.getByText("Convidar alguém")).toBeOnTheScreen();
  expect(screen.getByText("Gere um link e envie por mensagem. Vale por 7 dias.")).toBeOnTheScreen();
  expect(screen.getByText("Convites pendentes")).toBeOnTheScreen();
  expect(screen.getByText("pend@x.com")).toBeOnTheScreen();
  expect(screen.queryByText("aceito@x.com")).toBeNull();
});

test("sem convites pendentes, o bloco 'Convites pendentes' não aparece", async () => {
  ready(org({ invitations: [{ id: "i2", email: "aceito@x.com", status: "accepted" }] }), "owner");
  await renderApp(<Conta />);
  expect(screen.getByText("Convidar alguém")).toBeOnTheScreen();
  expect(screen.queryByText("Convites pendentes")).toBeNull();
});

test("membro não vê 'Convidar alguém' nem 'Convites pendentes'", async () => {
  ready(org({ invitations: [{ id: "i1", email: "pend@x.com", status: "pending" }] }), "member");
  await renderApp(<Conta />);
  expect(screen.getByText("Pessoas nesta conta")).toBeOnTheScreen();
  expect(screen.queryByText("Convidar alguém")).toBeNull();
  expect(screen.queryByText("Convites pendentes")).toBeNull();
});

test("tem o cartão de Aparência e o de notificações", async () => {
  ready(org(), "owner");
  await renderApp(<Conta />);
  expect(screen.getByText("Aparência")).toBeOnTheScreen();
  expect(screen.getByLabelText("Tema do aplicativo")).toBeOnTheScreen();
  expect(await screen.findByText("Receba avisos no celular")).toBeOnTheScreen();
});

test("na web o cartão de Aparência também aparece (Padrão, Claro e Escuro valem lá)", async () => {
  ready(org(), "owner");
  const original = Platform.OS;
  Platform.OS = "web";
  await renderApp(<Conta />);
  expect(screen.getByText("Aparência")).toBeOnTheScreen();
  Platform.OS = original;
});

test.each(["owner", "admin", "member"])("o cartão de excluir conta aparece para qualquer papel (%s), no fim da tela", async (role) => {
  ready(org(), role);
  await renderApp(<Conta />);
  expect(screen.getByText("Cartão excluir conta")).toBeOnTheScreen();
});

test("carregando mostra o esqueleto e não pisca o cartão de convite enquanto o papel não chega", async () => {
  mockOrg.value = { data: org(), isPending: false, refetch: jest.fn() };
  mockMe.value = { isPending: true, isError: false, refetch: jest.fn() };
  await renderApp(<Conta />);
  expect(screen.getByLabelText("Carregando")).toBeOnTheScreen();
  expect(screen.queryByText("Convidar alguém")).toBeNull();
});

test("erro mostra a tela de erro e 'Tentar de novo' refaz organização e papel", async () => {
  mockOrg.value = { data: null, isPending: false, error: { status: 500 }, refetch: jest.fn() };
  mockMe.value = { isPending: false, isError: false, data: { role: "owner" }, refetch: jest.fn() };
  await renderApp(<Conta />);
  await fireEvent.press(screen.getByRole("button", { name: "Tentar de novo" }));
  expect(mockOrg.value.refetch).toHaveBeenCalledTimes(1);
  expect(mockMe.value.refetch).toHaveBeenCalledTimes(1);
});

test("puxar para atualizar refaz organização e papel", async () => {
  ready(org(), "owner");
  await renderApp(<Conta />);
  await act(async () => { screen.getByTestId("conta-scroll").props.refreshControl.props.onRefresh(); });
  expect(mockOrg.value.refetch).toHaveBeenCalledTimes(1);
  expect(mockMe.value.refetch).toHaveBeenCalledTimes(1);
});
