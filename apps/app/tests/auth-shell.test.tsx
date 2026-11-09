import { screen } from "@testing-library/react-native";
import { renderApp } from "./helpers";
import { Text } from "react-native";
import { AuthShell } from "@/components/auth-shell";

test("no celular o logo é o ícone + o nome 'Medicron' (não só o ícone)", async () => {
  await renderApp(<AuthShell><Text>conteúdo</Text></AuthShell>);
  expect(screen.getByLabelText("Logo do Medicron")).toBeOnTheScreen();
  expect(screen.getByText("Medicron")).toBeOnTheScreen();
  expect(screen.getByText("Horários de remédios e cuidados de quem você cuida")).toBeOnTheScreen();
});
