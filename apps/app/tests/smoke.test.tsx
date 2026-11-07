import { render, screen } from "@testing-library/react-native";
import Index from "@/app/index";

test("a rota inicial mostra o nome do app", async () => {
  await render(<Index />);
  expect(screen.getByText("Medicron")).toBeTruthy();
});
