import { render, screen } from "@testing-library/react-native";
import { UpdateRequired } from "@/components/update-required";

test("tela fixa de atualização, com a versão mínima e sem botão de tentar de novo", async () => {
  await render(<UpdateRequired minVersion="2.0.0" />);
  expect(screen.getByText("Atualize o app para continuar")).toBeTruthy();
  expect(screen.getByText(/2\.0\.0/)).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
});
