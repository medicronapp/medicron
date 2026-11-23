import { screen, fireEvent } from "@testing-library/react-native";
import { renderApp } from "./helpers";

const mockRouter = { push: jest.fn(), replace: jest.fn() };
const mockParams: { value: Record<string, string> } = { value: {} };
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams.value,
  Slot: () => null,
}));

const mockAuth = { requestPasswordReset: jest.fn(), resetPassword: jest.fn(), signIn: { email: jest.fn() } };
jest.mock("@/lib/auth-client", () => ({
  authClient: {
    requestPasswordReset: (a: unknown) => mockAuth.requestPasswordReset(a),
    resetPassword: (a: unknown) => mockAuth.resetPassword(a),
    signIn: { email: (a: unknown) => mockAuth.signIn.email(a) },
  },
}));
jest.mock("@/lib/session", () => ({ useAppSession: () => ({ status: "signedOut", orgCount: 0, activeOrgId: null, signOut: jest.fn() }) }));

import Entrar from "@/app/(auth)/entrar";
import EsqueciSenha from "@/app/(auth)/esqueci-senha";
import RedefinirSenha from "@/app/(auth)/redefinir-senha";

const NETWORK = "Sem conexão. Verifique a internet e tente de novo.";
const type = async (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.value = {};
  mockAuth.requestPasswordReset.mockResolvedValue({ data: { status: true }, error: null });
  mockAuth.resetPassword.mockResolvedValue({ data: { status: true }, error: null });
});

describe("entrar: link para recuperar a senha", () => {
  test("'Esqueci minha senha' abre a tela de pedido do link", async () => {
    await renderApp(<Entrar />);
    await fireEvent.press(screen.getByRole("link", { name: "Esqueci minha senha" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/esqueci-senha");
  });
});

describe("esqueci-senha", () => {
  test("título e campo de e-mail", async () => {
    await renderApp(<EsqueciSenha />);
    expect(screen.getByRole("header", { name: "Esqueci minha senha" })).toBeOnTheScreen();
    expect(screen.getByLabelText("E-mail")).toBeOnTheScreen();
  });

  test("sem e-mail não pede nada", async () => {
    await renderApp(<EsqueciSenha />);
    await fireEvent.press(screen.getByRole("button", { name: "Enviar link" }));
    expect(mockAuth.requestPasswordReset).not.toHaveBeenCalled();
  });

  test("envia o e-mail (sem espaços) e mostra a mensagem neutra: não diz se a conta existe", async () => {
    await renderApp(<EsqueciSenha />);
    await type("E-mail", "  ana@x.com ");
    await fireEvent.press(screen.getByRole("button", { name: "Enviar link" }));
    expect(mockAuth.requestPasswordReset).toHaveBeenCalledWith({ email: "ana@x.com" });
    expect(await screen.findByText(/Se houver uma conta com ana@x\.com, enviamos um link para criar uma nova senha\./)).toBeOnTheScreen();
    expect(screen.getByText(/spam/i)).toBeOnTheScreen();
  });

  test("depois de enviar, 'Voltar para entrar' leva ao login", async () => {
    await renderApp(<EsqueciSenha />);
    await type("E-mail", "ana@x.com");
    await fireEvent.press(screen.getByRole("button", { name: "Enviar link" }));
    await screen.findByText(/enviamos um link/);
    await fireEvent.press(screen.getByRole("link", { name: "Voltar para entrar" }));
    expect(mockRouter.replace).toHaveBeenCalledWith("/entrar");
  });

  test("sem internet: avisa e permite tentar de novo", async () => {
    mockAuth.requestPasswordReset.mockRejectedValue(new Error("rede"));
    await renderApp(<EsqueciSenha />);
    await type("E-mail", "ana@x.com");
    await fireEvent.press(screen.getByRole("button", { name: "Enviar link" }));
    expect(await screen.findByText(NETWORK)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Enviar link" })).toBeEnabled();
  });

  test("muitas tentativas (429): mensagem de espera", async () => {
    mockAuth.requestPasswordReset.mockResolvedValue({ data: null, error: { status: 429 } });
    await renderApp(<EsqueciSenha />);
    await type("E-mail", "ana@x.com");
    await fireEvent.press(screen.getByRole("button", { name: "Enviar link" }));
    expect(await screen.findByText("Muitas tentativas. Aguarde um instante e tente de novo.")).toBeOnTheScreen();
  });
});

describe("redefinir-senha", () => {
  beforeEach(() => { mockParams.value = { token: "tok123" }; });

  test("senhas diferentes: avisa e não envia", async () => {
    await renderApp(<RedefinirSenha />);
    await type("Nova senha", "NovaSenha-123");
    await type("Repetir a nova senha", "Outra-12345");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar nova senha" }));
    expect(await screen.findByText("As senhas não são iguais.")).toBeOnTheScreen();
    expect(mockAuth.resetPassword).not.toHaveBeenCalled();
  });

  test("senha curta: avisa e não envia", async () => {
    await renderApp(<RedefinirSenha />);
    await type("Nova senha", "curta");
    await type("Repetir a nova senha", "curta");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar nova senha" }));
    expect(await screen.findByText("A senha precisa ter no mínimo 8 caracteres.")).toBeOnTheScreen();
    expect(mockAuth.resetPassword).not.toHaveBeenCalled();
  });

  test("sucesso: manda a senha e o token do link e oferece entrar", async () => {
    await renderApp(<RedefinirSenha />);
    await type("Nova senha", "NovaSenha-123");
    await type("Repetir a nova senha", "NovaSenha-123");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar nova senha" }));
    expect(mockAuth.resetPassword).toHaveBeenCalledWith({ newPassword: "NovaSenha-123", token: "tok123" });
    expect(await screen.findByText("Senha alterada. Entre com a nova senha.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
    expect(mockRouter.replace).toHaveBeenCalledWith("/entrar");
  });

  test("link vencido ou já usado: explica e leva a pedir outro", async () => {
    mockAuth.resetPassword.mockResolvedValue({ data: null, error: { status: 400, code: "INVALID_TOKEN" } });
    await renderApp(<RedefinirSenha />);
    await type("Nova senha", "NovaSenha-123");
    await type("Repetir a nova senha", "NovaSenha-123");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar nova senha" }));
    expect(await screen.findByText("Este link venceu ou já foi usado. Peça um novo.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Pedir novo link" }));
    expect(mockRouter.replace).toHaveBeenCalledWith("/esqueci-senha");
  });

  test("sem token na URL: já mostra o link inválido, sem formulário", async () => {
    mockParams.value = {};
    await renderApp(<RedefinirSenha />);
    expect(screen.getByText("Este link venceu ou já foi usado. Peça um novo.")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Nova senha")).toBeNull();
  });

  test("sem internet: avisa sem perder o que foi digitado", async () => {
    mockAuth.resetPassword.mockRejectedValue(new Error("rede"));
    await renderApp(<RedefinirSenha />);
    await type("Nova senha", "NovaSenha-123");
    await type("Repetir a nova senha", "NovaSenha-123");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar nova senha" }));
    expect(await screen.findByText(NETWORK)).toBeOnTheScreen();
    expect(screen.getByLabelText("Nova senha").props.value).toBe("NovaSenha-123");
  });
});
