import { StyleSheet, View, type ViewProps } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Text } from "@/components/ui/text";
import { Avatar } from "@/components/ui/avatar";
import { COLORS } from "@/theme/colors.generated";

describe("Text", () => {
  test("usa a Geist no peso da classe", async () => {
    await render(<Text className="text-sm font-semibold">Olá</Text>);
    expect(StyleSheet.flatten(screen.getByText("Olá").props.style).fontFamily).toBe("Geist_600SemiBold");
  });
  test("peso normal por padrão", async () => {
    await render(<Text>Olá</Text>);
    expect(StyleSheet.flatten(screen.getByText("Olá").props.style).fontFamily).toBe("Geist_400Regular");
  });
});

describe("Button", () => {
  test("dispara onPress e mostra o rótulo", async () => {
    const onPress = jest.fn();
    await render(<Button onPress={onPress}>Salvar</Button>);
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  test("desabilitado não dispara", async () => {
    const onPress = jest.fn();
    await render(<Button disabled onPress={onPress}>Salvar</Button>);
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
    expect(onPress).not.toHaveBeenCalled();
  });
  test("carregando mostra o indicador, marca ocupado e não dispara", async () => {
    const onPress = jest.fn();
    await render(<Button loading onPress={onPress}>Entrando…</Button>);
    expect(screen.getByTestId("button-spinner")).toBeTruthy();
    const btn = screen.getByRole("button", { name: "Entrando…" });
    expect(btn.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    await fireEvent.press(btn);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("campos", () => {
  test("PasswordInput alterna a visibilidade e troca o rótulo acessível", async () => {
    await render(<PasswordInput testID="senha" />);
    expect(screen.getByTestId("senha").props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(screen.getByTestId("senha").props.secureTextEntry).toBe(false);
    expect(screen.getByRole("button", { name: "Ocultar senha" })).toBeTruthy();
  });
  test("Input marca o estado inválido para leitores de tela", async () => {
    await render(<Input testID="i" invalid />);
    expect(screen.getByTestId("i").props["aria-invalid"]).toBe(true);
  });
  test("FormField mostra rótulo, dica e erro (o erro é um alerta) e liga o rótulo ao campo", async () => {
    await render(
      <FormField label="E-mail" hint="Usamos para entrar." error="E-mail inválido.">
        <Input testID="email" />
      </FormField>,
    );
    expect(screen.getByText("E-mail")).toBeTruthy();
    expect(screen.getByText("Usamos para entrar.")).toBeTruthy();
    expect(screen.getByRole("alert")).toHaveTextContent("E-mail inválido.");
    expect(screen.getByTestId("email").props["aria-invalid"]).toBe(true);
    expect(screen.getByTestId("email").props.accessibilityLabel).toBe("E-mail");
  });
});

describe("Alert, Badge, Avatar", () => {
  test("Alert é um alerta com a descrição", async () => {
    await render(<Alert variant="destructive"><AlertDescription>E-mail ou senha incorretos.</AlertDescription></Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent("E-mail ou senha incorretos.");
  });
  test("Badge mostra o texto", async () => {
    await render(<Badge variant="secondary">A cada 8 horas</Badge>);
    expect(screen.getByText("A cada 8 horas")).toBeTruthy();
  });
  test("Avatar mostra o fallback", async () => {
    await render(<Avatar fallback="A" />);
    expect(screen.getByText("A")).toBeTruthy();
  });
});

describe("Icon", () => {
  const Fake = (p: ViewProps & { color?: string; size?: number }) => <View testID="fake" {...p} />;
  test("aplica a cor do tema (ícones não herdam className)", async () => {
    await render(<Icon icon={Fake as never} color="primary" size={18} />);
    expect(screen.getByTestId("fake").props.color).toBe(COLORS.light.primary);
    expect(screen.getByTestId("fake").props.size).toBe(18);
  });
  test("cor padrão é o texto principal", async () => {
    await render(<Icon icon={Fake as never} />);
    expect(screen.getByTestId("fake").props.color).toBe(COLORS.light.foreground);
  });
});
