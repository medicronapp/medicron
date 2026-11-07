import { useState } from "react";
import { Text as RNText } from "react-native";
import { Check, LogOut } from "lucide-react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Drawer } from "@/components/ui/drawer";
import { MenuSheet } from "@/components/ui/menu-sheet";
import { Toaster, toast } from "@/components/ui/toast";
import { lastModal } from "./../mocks/gorhom-bottom-sheet";
import { renderApp } from "../helpers";

jest.mock("sonner-native", () => ({ Toaster: jest.fn(() => null), toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));

describe("Drawer", () => {
  test("fechado não mostra nada; aberto mostra título, descrição, conteúdo e rodapé", async () => {
    const { rerender } = await renderApp(
      <Drawer open={false} onOpenChange={() => {}} title="Editar rotina"><RNText>conteúdo</RNText></Drawer>,
    );
    expect(screen.queryByText("Editar rotina")).toBeNull();
    await rerender(
      <Drawer open onOpenChange={() => {}} title="Editar rotina" description="Izzy" footer={<RNText>rodapé</RNText>}>
        <RNText>conteúdo</RNText>
      </Drawer>,
    );
    expect(screen.getByRole("header", { name: "Editar rotina" })).toBeTruthy();
    expect(screen.getByText("Izzy")).toBeTruthy();
    expect(screen.getByText("conteúdo")).toBeTruthy();
    expect(screen.getByText("rodapé")).toBeTruthy();
  });

  test("arrastar para baixo (dispensar) avisa que fechou", async () => {
    const onOpenChange = jest.fn();
    await renderApp(<Drawer open onOpenChange={onOpenChange} title="x"><RNText>c</RNText></Drawer>);
    await act(async () => lastModal.props.onDismiss?.());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("abre depois de montar fechado (sem dismiss() na montagem)", async () => {
    const { rerender } = await renderApp(<Drawer open={false} onOpenChange={() => {}} title="x"><RNText>c</RNText></Drawer>);
    await rerender(<Drawer open onOpenChange={() => {}} title="x"><RNText>c</RNText></Drawer>);
    expect(screen.getByText("c")).toBeTruthy();
  });

  test("reabre depois de dispensado pelo próprio sheet (arrastar ou tocar fora)", async () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <RNText onPress={() => setOpen(true)}>abrir</RNText>
          <Drawer open={open} onOpenChange={setOpen} title="x"><RNText>c</RNText></Drawer>
        </>
      );
    }
    await renderApp(<Harness />);
    expect(screen.getByText("c")).toBeTruthy();
    await act(async () => lastModal.userDismiss());
    expect(screen.queryByText("c")).toBeNull();
    await fireEvent.press(screen.getByText("abrir"));
    expect(screen.getByText("c")).toBeTruthy();
  });

  test("fechar por fora (open=false) some com o conteúdo", async () => {
    const { rerender } = await renderApp(<Drawer open onOpenChange={() => {}} title="x"><RNText>c</RNText></Drawer>);
    expect(screen.getByText("c")).toBeTruthy();
    await rerender(<Drawer open={false} onOpenChange={() => {}} title="x"><RNText>c</RNText></Drawer>);
    expect(screen.queryByText("c")).toBeNull();
  });
});

describe("MenuSheet", () => {
  test("tocar num item executa a ação e depois fecha", async () => {
    const order: string[] = [];
    const onOpenChange = (o: boolean) => order.push(`aberto:${o}`);
    await renderApp(
      <MenuSheet
        open onOpenChange={onOpenChange} title="Conta"
        items={[
          { key: "a", label: "Casa da família", icon: Check, selected: true, onPress: () => order.push("a") },
          { key: "sair", label: "Sair", icon: LogOut, destructive: true, onPress: () => order.push("sair") },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: "Casa da família" }).props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(screen.getByRole("button", { name: "Sair" }));
    expect(order).toEqual(["sair", "aberto:false"]);
  });
});

describe("toast", () => {
  // O sonner-native precisa de gestos e workletos nativos (não existem no Jest): testamos o contrato do nosso Toaster.
  test("Toaster fica no topo, centralizado e colorido por tipo, e reexporta o toast", async () => {
    const sonner = jest.requireMock("sonner-native") as { Toaster: jest.Mock; toast: unknown };
    await render(<Toaster />);
    expect(sonner.Toaster.mock.calls[0][0]).toMatchObject({ position: "top-center", richColors: true });
    expect(toast).toBe(sonner.toast);
  });
});
