import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderApp } from "./helpers";

jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn(async () => true) }));
jest.mock("@/components/ui/toast", () => ({ toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() }, Toaster: () => null }));
jest.mock("@/lib/api-url", () => ({ API_URL: "https://medicron.com.br", inviteBase: () => "https://medicron.com.br" }));
const mockInvite = jest.fn();
const mockCancel = jest.fn();
jest.mock("@/lib/org", () => ({
  inviteMember: (...a: unknown[]) => mockInvite(...a),
  cancelInvitation: (...a: unknown[]) => mockCancel(...a),
}));

import * as Clipboard from "expo-clipboard";
import { toast as mockToast } from "@/components/ui/toast";
import { MemberRow } from "@/components/member-row";
import { CopyLink } from "@/components/copy-link";
import { InviteForm } from "@/components/invite-form";
import { InvitationRow } from "@/components/invitation-row";

beforeEach(() => jest.clearAllMocks());

describe("MemberRow", () => {
  test.each([["owner", "Dono"], ["admin", "Administrador"], ["member", "Membro"], ["viewer", "viewer"]])("papel %s mostra '%s'", async (role, label) => {
    await renderApp(<MemberRow name="Maria Silva" email="maria@x.com" role={role} />);
    expect(screen.getByText("Maria Silva")).toBeOnTheScreen();
    expect(screen.getByText("maria@x.com")).toBeOnTheScreen();
    expect(screen.getByText("MS")).toBeOnTheScreen();
    expect(screen.getByText(label)).toBeOnTheScreen();
  });
});

describe("CopyLink", () => {
  test("mostra o texto e o link; copiar usa a área de transferência e avisa", async () => {
    await renderApp(<CopyLink link="https://medicron.com.br/convite/abc" />);
    expect(screen.getByText("Convite criado. Envie este link para a pessoa:")).toBeOnTheScreen();
    expect(screen.getByLabelText("Link do convite").props.value).toBe("https://medicron.com.br/convite/abc");
    await fireEvent.press(screen.getByRole("button", { name: "Copiar link do convite" }));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith("https://medicron.com.br/convite/abc");
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith("Link copiado"));
  });
});

describe("InviteForm", () => {
  const email = (t: string) => fireEvent.changeText(screen.getByLabelText("E-mail da pessoa"), t);
  const send = () => fireEvent.press(screen.getByRole("button", { name: "Gerar link de convite" }));

  test("papel padrão Administrador; envia com e-mail aparado e mostra o link", async () => {
    mockInvite.mockResolvedValue({ id: "inv1" });
    await renderApp(<InviteForm />);
    expect(screen.getByText("Administrador (gerencia tudo)")).toBeOnTheScreen();
    expect(screen.getByText("Administradores também podem convidar pessoas.")).toBeOnTheScreen();
    await email("  ana@x.com ");
    await send();
    await waitFor(() => expect(mockInvite).toHaveBeenCalledWith("ana@x.com", "admin"));
    expect(await screen.findByLabelText("Link do convite")).toBeOnTheScreen();
    expect(screen.getByLabelText("Link do convite").props.value).toBe("https://medicron.com.br/convite/inv1");
    expect(screen.getByLabelText("E-mail da pessoa").props.value).toBe("");
  });

  test("trocar o papel para Membro muda o que é enviado", async () => {
    mockInvite.mockResolvedValue({ id: "inv1" });
    await renderApp(<InviteForm />);
    await fireEvent.press(screen.getByRole("button", { name: "Papel" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Membro" }));
    await email("b@x.com");
    await send();
    await waitFor(() => expect(mockInvite).toHaveBeenCalledWith("b@x.com", "member"));
  });

  test.each(["", "   ", "abc", "a@b"])("e-mail '%s' mostra o erro e não envia", async (v) => {
    await renderApp(<InviteForm />);
    await email(v);
    await send();
    expect(await screen.findByText("Informe um e-mail válido")).toBeOnTheScreen();
    expect(mockInvite).not.toHaveBeenCalled();
  });

  test("duplo toque envia uma vez só", async () => {
    let finish: (v: unknown) => void = () => {};
    mockInvite.mockReturnValue(new Promise((r) => { finish = r; }));
    await renderApp(<InviteForm />);
    await email("a@x.com");
    const b = screen.getByRole("button", { name: "Gerar link de convite" });
    await fireEvent.press(b);
    await fireEvent.press(b);
    expect(mockInvite).toHaveBeenCalledTimes(1);
    finish({ id: "inv1" });
    await screen.findByLabelText("Link do convite");
  });

  test("erro avisa com a mensagem e mantém o e-mail", async () => {
    mockInvite.mockRejectedValue(new Error("Usuário já é membro."));
    await renderApp(<InviteForm />);
    await email("a@x.com");
    await send();
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Usuário já é membro."));
    expect(screen.getByLabelText("E-mail da pessoa").props.value).toBe("a@x.com");
    expect(screen.queryByLabelText("Link do convite")).toBeNull();
    expect(screen.getByRole("button", { name: "Gerar link de convite" })).toBeEnabled();
  });
});

describe("InvitationRow", () => {
  test("mostra o e-mail e o selo; copiar link usa o endereço do convite", async () => {
    await renderApp(<InvitationRow id="inv1" email="ana@x.com" />);
    expect(screen.getByText("ana@x.com")).toBeOnTheScreen();
    expect(screen.getByText("Pendente")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Copiar link" }));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith("https://medicron.com.br/convite/inv1");
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith("Link copiado"));
  });

  test("cancelar pede confirmação e cancela uma vez; avisa", async () => {
    mockCancel.mockResolvedValue(undefined);
    await renderApp(<InvitationRow id="inv1" email="ana@x.com" />);
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));
    expect(await screen.findByText("Cancelar convite?")).toBeOnTheScreen();
    expect(screen.getByText("O link enviado para ana@x.com deixará de funcionar.")).toBeOnTheScreen();
    const b = screen.getByRole("button", { name: "Cancelar convite" });
    await fireEvent.press(b);
    await fireEvent.press(b);
    await waitFor(() => expect(mockCancel).toHaveBeenCalledWith("inv1"));
    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(mockToast.success).toHaveBeenCalledWith("Convite cancelado");
  });

  test("erro ao cancelar avisa e mantém o sheet", async () => {
    mockCancel.mockRejectedValue(new Error("Não foi possível cancelar o convite."));
    await renderApp(<InvitationRow id="inv1" email="ana@x.com" />);
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Cancelar convite" }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Não foi possível cancelar o convite."));
    expect(screen.getByText("Cancelar convite?")).toBeOnTheScreen();
  });
});
