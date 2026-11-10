import { Linking, Text } from "react-native";
import { fireEvent, screen } from "@testing-library/react-native";
import { renderApp } from "./helpers";
import { AuthShell } from "@/components/auth-shell";
import { LegalNote, MEDICAL_DISCLAIMER, PRIVACY_URL } from "@/components/legal-note";

beforeEach(() => { jest.spyOn(Linking, "openURL").mockResolvedValue(true); });
afterEach(() => { jest.restoreAllMocks(); });

describe("aviso legal do app (exigido pela revisão das lojas)", () => {
  test("a política de privacidade é a mesma das fichas das lojas", () => {
    expect(PRIVACY_URL).toBe("https://medicron.com.br/privacidade");
  });

  test("o aviso diz que o app só organiza lembretes e não faz diagnóstico nem indica doses (mesmo texto do hotsite)", () => {
    expect(MEDICAL_DISCLAIMER).toBe("O Medicron é um organizador de lembretes. Não faz diagnóstico nem indica doses ou tratamentos: siga a orientação do seu médico ou veterinário.");
  });

  test("mostra o aviso e o link, e tocar no link abre a política de privacidade", async () => {
    await renderApp(<LegalNote />);
    expect(screen.getByText(MEDICAL_DISCLAIMER)).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("link", { name: "Política de privacidade" }));
    expect(Linking.openURL).toHaveBeenCalledWith(PRIVACY_URL);
  });

  test("o link tem alvo de toque de pelo menos 44 pt", async () => {
    await renderApp(<LegalNote />);
    expect(screen.getByRole("link", { name: "Política de privacidade" }).props.className ?? "").toContain("min-h-11");
  });

  test("as telas de entrar e criar conta (AuthShell) mostram o aviso e o link, antes mesmo de entrar", async () => {
    await renderApp(<AuthShell><Text>formulário</Text></AuthShell>);
    expect(screen.getByText(MEDICAL_DISCLAIMER)).toBeOnTheScreen();
    expect(screen.getByRole("link", { name: "Política de privacidade" })).toBeOnTheScreen();
  });
});
