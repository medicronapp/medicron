import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderApp } from "./helpers";
import { queryClient } from "@/lib/api/query";
import { NETWORK_MESSAGE } from "@/lib/api/errors";

const mockDelete = jest.fn();
jest.mock("@/lib/auth-client", () => ({ authClient: { deleteUser: (a: unknown) => mockDelete(a) } }));
const mockUnregister = jest.fn(async () => {});
jest.mock("@/lib/push", () => ({ unregisterThisDevice: () => mockUnregister() }));

import { DeleteAccount } from "@/components/delete-account";

const DESCRIPTION = "Apaga o seu acesso e os seus dados. Se você for a única pessoa de uma conta, os pacientes, itens e rotinas dela também serão apagados. Isso não pode ser desfeito.";

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
  mockDelete.mockResolvedValue({ data: { success: true }, error: null });
});
afterAll(() => queryClient.clear());

const open = async () => {
  await fireEvent.press(screen.getByRole("button", { name: "Excluir minha conta" }));
  await screen.findByText("Excluir sua conta?");
};
const typePassword = (t: string) => fireEvent.changeText(screen.getByLabelText("Senha"), t);
const confirm = () => fireEvent.press(screen.getByRole("button", { name: "Excluir conta" }));

test("cartão com o título, o texto de aviso e o botão destrutivo", async () => {
  await renderApp(<DeleteAccount />);
  expect(screen.getByText("Excluir conta")).toBeOnTheScreen();
  expect(screen.getByText(DESCRIPTION)).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Excluir minha conta" })).toBeOnTheScreen();
});

test("o sheet pede a senha e só habilita o botão com ela preenchida", async () => {
  await renderApp(<DeleteAccount />);
  await open();
  expect(screen.getAllByText(DESCRIPTION).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByRole("button", { name: "Excluir conta" })).toBeDisabled();
  await typePassword("segredo123");
  expect(screen.getByRole("button", { name: "Excluir conta" })).toBeEnabled();
});

test("sucesso: exclui com a senha, limpa o token local do push depois, esvazia o cache e fecha", async () => {
  queryClient.setQueryData(["patients"], [{ id: "a" }]);
  await renderApp(<DeleteAccount />);
  await open();
  await typePassword("segredo123");
  await confirm();
  await waitFor(() => expect(mockDelete).toHaveBeenCalledWith({ password: "segredo123" }));
  await waitFor(() => expect(mockUnregister).toHaveBeenCalledTimes(1));
  expect(mockDelete.mock.invocationCallOrder[0]).toBeLessThan(mockUnregister.mock.invocationCallOrder[0]);
  expect(queryClient.getQueryData(["patients"])).toBeUndefined();
  await waitFor(() => expect(screen.queryByText("Excluir sua conta?")).toBeNull());
});

test("senha errada: 'Senha incorreta.', o sheet continua e nada é limpo (o push segue valendo)", async () => {
  mockDelete.mockResolvedValue({ data: null, error: { status: 400, code: "INVALID_PASSWORD", message: "Invalid password" } });
  queryClient.setQueryData(["patients"], [{ id: "a" }]);
  await renderApp(<DeleteAccount />);
  await open();
  await typePassword("errada");
  await confirm();
  expect(await screen.findByText("Senha incorreta.")).toBeOnTheScreen();
  expect(screen.getByText("Excluir sua conta?")).toBeOnTheScreen();
  expect(mockUnregister).not.toHaveBeenCalled();
  expect(queryClient.getQueryData(["patients"])).toBeDefined();
  expect(screen.getByRole("button", { name: "Excluir conta" })).toBeEnabled();
});

test("outro erro do servidor: mensagem genérica e destrava", async () => {
  mockDelete.mockResolvedValue({ data: null, error: { status: 500, message: "x" } });
  await renderApp(<DeleteAccount />);
  await open();
  await typePassword("segredo123");
  await confirm();
  expect(await screen.findByText("Não foi possível excluir a conta. Tente de novo.")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Excluir conta" })).toBeEnabled();
});

test("erro de rede: mensagem de conexão e destrava", async () => {
  mockDelete.mockRejectedValue(new TypeError("Network request failed"));
  await renderApp(<DeleteAccount />);
  await open();
  await typePassword("segredo123");
  await confirm();
  expect(await screen.findByText(NETWORK_MESSAGE)).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Excluir conta" })).toBeEnabled();
  expect(mockUnregister).not.toHaveBeenCalled();
});

test("duplo toque exclui uma vez só", async () => {
  let finish: (v: unknown) => void = () => {};
  mockDelete.mockReturnValue(new Promise((r) => { finish = r; }));
  await renderApp(<DeleteAccount />);
  await open();
  await typePassword("segredo123");
  const b = screen.getByRole("button", { name: "Excluir conta" });
  await fireEvent.press(b);
  await fireEvent.press(b);
  expect(mockDelete).toHaveBeenCalledTimes(1);
  finish({ data: { success: true }, error: null });
  await waitFor(() => expect(mockUnregister).toHaveBeenCalled());
});

test("cancelar fecha sem chamar nada", async () => {
  await renderApp(<DeleteAccount />);
  await open();
  await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));
  expect(mockDelete).not.toHaveBeenCalled();
});

test("outro 400 (que não é senha errada) mostra a mensagem genérica, não 'Senha incorreta.'", async () => {
  mockDelete.mockResolvedValue({ data: null, error: { status: 400, code: "CREDENTIAL_ACCOUNT_NOT_FOUND", message: "x" } });
  await renderApp(<DeleteAccount />);
  await open();
  await typePassword("segredo123");
  await confirm();
  expect(await screen.findByText("Não foi possível excluir a conta. Tente de novo.")).toBeOnTheScreen();
  expect(screen.queryByText("Senha incorreta.")).toBeNull();
});
