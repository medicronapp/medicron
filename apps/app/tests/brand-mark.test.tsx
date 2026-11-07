import { render, screen } from "@testing-library/react-native";
import { BrandMark } from "@/components/brand-mark";

type Node = { type: string; children?: (Node | string)[] | null };
const count = (n: Node | string, type: string): number =>
  typeof n === "string" ? 0 : (n.type === type ? 1 : 0) + (n.children ?? []).reduce<number>((s, c) => s + count(c, type), 0);

test("BrandMark desenha o anel e o ponto do logo Ciclo e é decorativo", async () => {
  await render(<BrandMark testID="logo" />);
  expect(count(screen.toJSON() as Node, "RNSVGCircle")).toBe(2);
  expect(screen.getByTestId("logo", { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);
  expect(screen.getByTestId("logo", { includeHiddenElements: true }).props.importantForAccessibility).toBe("no-hide-descendants");
});
