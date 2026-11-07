import { Text } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { COLORS } from "@/theme/colors.generated";
import { useColors } from "@/theme/colors";

const mockScheme = jest.fn();
jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({ __esModule: true, default: () => mockScheme() }));

function Probe() {
  return <Text testID="p">{useColors().primary}</Text>;
}

test("useColors devolve as cores do tema do sistema e troca quando o tema muda", async () => {
  mockScheme.mockReturnValue("light");
  const { rerender } = await render(<Probe />);
  expect(screen.getByTestId("p").props.children).toBe(COLORS.light.primary);

  mockScheme.mockReturnValue("dark");
  await rerender(<Probe />);
  expect(screen.getByTestId("p").props.children).toBe(COLORS.dark.primary);
});

test("sem esquema definido usa o tema claro", async () => {
  mockScheme.mockReturnValue(null);
  await render(<Probe />);
  expect(screen.getByTestId("p").props.children).toBe(COLORS.light.primary);
});
