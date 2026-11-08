import { screen, fireEvent, waitFor } from "@testing-library/react-native";
import { renderApp } from "./helpers";
import { queryClient } from "@/lib/api/query";

const mockRouter = { push: jest.fn(), replace: jest.fn() };
const mockParams: { value: Record<string, string> } = { value: {} };
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams.value,
  Slot: () => null,
}));

const mockAuth = {
  signIn: { email: jest.fn() },
  signUp: { email: jest.fn() },
  organization: { create: jest.fn(), setActive: jest.fn() },
};
jest.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: { email: (a: unknown) => mockAuth.signIn.email(a) },
    signUp: { email: (a: unknown) => mockAuth.signUp.email(a) },
    organization: {
      create: (a: unknown) => mockAuth.organization.create(a),
      setActive: (a: unknown) => mockAuth.organization.setActive(a),
    },
  },
}));

import Entrar from "@/app/(auth)/entrar";
import Cadastrar from "@/app/(auth)/cadastrar";
import NovaConta from "@/app/nova-conta";
import AuthLayout from "@/app/(auth)/_layout";

const NETWORK = "Sem conexão. Verifique a internet e tente de novo.";
const type = async (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.value = {};
  mockAuth.signIn.email.mockResolvedValue({ data: {}, error: null });
  mockAuth.signUp.email.mockResolvedValue({ data: {}, error: null });
  mockAuth.organization.create.mockResolvedValue({ data: { id: "org1" }, error: null });
  mockAuth.organization.setActive.mockResolvedValue({ data: {}, error: null });
});

describe("entrar", () => {
  async function fill() {
    await type("E-mail", "ana@x.com");
    await type("Senha", "segredo123");
  }

  test("mostra título, subtítulo e o link para criar conta levando o destino", async () => {
    mockParams.value = { next: "/pacientes" };
    await renderApp(<Entrar />);
    expect(screen.getByRole("header", { name: "Entrar" })).toBeOnTheScreen();
    expect(screen.getByText("Acesse sua conta para ver os cuidados de hoje.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Criar conta" }));
    expect(mockRouter.replace).toHaveBeenCalledWith("/cadastrar?next=%2Fpacientes");
  });

  test("falha de login mostra o erro e destrava o botão", async () => {
    mockAuth.signIn.email.mockResolvedValue({ data: null, error: { message: "x" } });
    await renderApp(<Entrar />);
    await fill();
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("E-mail ou senha incorretos.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  test("limite de tentativas (429) não é tratado como senha errada", async () => {
    mockAuth.signIn.email.mockResolvedValue({ data: null, error: { status: 429 } });
    await renderApp(<Entrar />);
    await fill();
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("Muitas tentativas. Aguarde um instante e tente de novo.")).toBeOnTheScreen();
  });

  test("sucesso vai para o destino seguro", async () => {
    mockParams.value = { next: "/pacientes" };
    await renderApp(<Entrar />);
    await fill();
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/pacientes"));
    expect(mockAuth.signIn.email).toHaveBeenCalledWith({ email: "ana@x.com", password: "segredo123" });
  });

  test("destino externo (//evil.com) vira a raiz", async () => {
    mockParams.value = { next: "//evil.com" };
    await renderApp(<Entrar />);
    await fill();
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/"));
  });

  test("erro de rede mostra a mensagem de conexão e destrava", async () => {
    mockAuth.signIn.email.mockRejectedValue(new TypeError("Network request failed"));
    await renderApp(<Entrar />);
    await fill();
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText(NETWORK)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });

  test("campos vazios não enviam", async () => {
    await renderApp(<Entrar />);
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
    expect(mockAuth.signIn.email).not.toHaveBeenCalled();
  });
});

describe("cadastrar", () => {
  async function fill(password = "segredo123") {
    await type("Seu nome", "Ana Souza");
    await type("E-mail", "ana@x.com");
    await type("Senha", password);
  }

  test("textos e link para entrar", async () => {
    await renderApp(<Cadastrar />);
    expect(screen.getByRole("header", { name: "Criar conta" })).toBeOnTheScreen();
    expect(screen.getByText("Leva menos de um minuto. Depois é só cadastrar seus pacientes.")).toBeOnTheScreen();
    expect(screen.getByText("Mínimo de 8 caracteres.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Entrar" }));
    expect(mockRouter.replace).toHaveBeenCalledWith("/entrar?next=%2F");
  });

  test("cria a conta e depois a casa 'Casa de Ana' com slug derivado", async () => {
    await renderApp(<Cadastrar />);
    await fill();
    await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/"));
    expect(mockAuth.signUp.email).toHaveBeenCalledWith({ name: "Ana Souza", email: "ana@x.com", password: "segredo123" });
    const org = mockAuth.organization.create.mock.calls[0][0] as { name: string; slug: string };
    expect(org.name).toBe("Casa de Ana");
    expect(org.slug).toMatch(/^casa-de-ana-/);
  });

  test("vindo de convite não cria casa", async () => {
    mockParams.value = { next: "/convite/x" };
    await renderApp(<Cadastrar />);
    await fill();
    await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/convite/x"));
    expect(mockAuth.organization.create).not.toHaveBeenCalled();
  });

  test("senha de 7 caracteres não envia e explica", async () => {
    await renderApp(<Cadastrar />);
    await fill("1234567");
    await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));
    expect(mockAuth.signUp.email).not.toHaveBeenCalled();
    expect(await screen.findByText("A senha precisa ter no mínimo 8 caracteres.")).toBeOnTheScreen();
  });

  test("falha ao criar a casa mostra a mensagem específica e não navega", async () => {
    mockAuth.organization.create.mockResolvedValue({ data: null, error: { message: "x" } });
    await renderApp(<Cadastrar />);
    await fill();
    await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));
    expect(await screen.findByText("Conta criada, mas não foi possível criar sua casa. Tente em Nova conta.")).toBeOnTheScreen();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  test("erro do cadastro mostra a mensagem da API", async () => {
    mockAuth.signUp.email.mockResolvedValue({ data: null, error: { message: "E-mail já cadastrado." } });
    await renderApp(<Cadastrar />);
    await fill();
    await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));
    expect(await screen.findByText("E-mail já cadastrado.")).toBeOnTheScreen();
  });

  test("erro de rede mostra a mensagem de conexão e destrava", async () => {
    mockAuth.signUp.email.mockRejectedValue(new TypeError("Network request failed"));
    await renderApp(<Cadastrar />);
    await fill();
    await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));
    expect(await screen.findByText(NETWORK)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Criar conta" })).toBeEnabled();
  });
});

describe("nova conta", () => {
  test("textos e dica", async () => {
    await renderApp(<NovaConta />);
    expect(screen.getByRole("header", { name: "Nova conta" })).toBeOnTheScreen();
    expect(screen.getByText("Cada conta tem seus próprios pacientes, itens e pessoas. Use uma para cada casa ou família.")).toBeOnTheScreen();
    expect(screen.getByText("Ex.: Casa da vovó")).toBeOnTheScreen();
    expect(screen.getByLabelText("Nome da conta").props.maxLength).toBe(60);
  });

  test("cria, ativa a conta e vai para a raiz", async () => {
    await renderApp(<NovaConta />);
    await type("Nome da conta", "Sítio");
    await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/"));
    expect(mockAuth.organization.setActive).toHaveBeenCalledWith({ organizationId: "org1" });
    expect((mockAuth.organization.create.mock.calls[0][0] as { slug: string }).slug).toMatch(/^sitio-/);
  });

  test("depois de ativar a conta nova, invalida os dados (o cabeçalho não pode mostrar a anterior)", async () => {
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    await renderApp(<NovaConta />);
    await type("Nome da conta", "Sítio");
    await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/"));
    expect(invalidate).toHaveBeenCalled();
  });

  test("a conta nova começa sem dados da anterior no cache", async () => {
    queryClient.setQueryData(["patients"], [{ id: "da-conta-antiga" }]);
    await renderApp(<NovaConta />);
    await type("Nome da conta", "Sítio");
    await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/"));
    expect(queryClient.getQueryData(["patients"])).toBeUndefined();
  });

  test("falha mostra o erro e destrava", async () => {
    mockAuth.organization.create.mockResolvedValue({ data: null, error: { message: "x" } });
    await renderApp(<NovaConta />);
    await type("Nome da conta", "Sítio");
    await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));
    expect(await screen.findByText("Não foi possível criar a conta.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Criar conta" })).toBeEnabled();
  });

  test("erro de rede mostra a mensagem de conexão", async () => {
    mockAuth.organization.create.mockRejectedValue(new TypeError("Network request failed"));
    await renderApp(<NovaConta />);
    await type("Nome da conta", "Sítio");
    await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));
    expect(await screen.findByText(NETWORK)).toBeOnTheScreen();
  });
});

describe("layout (auth)", () => {
  test("envolve o formulário com a marca e a frase, em celular", async () => {
    await renderApp(<AuthLayout />);
    expect(screen.getByText("Horários de remédios e cuidados de quem você cuida")).toBeOnTheScreen();
  });
});
