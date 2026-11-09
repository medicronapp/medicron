import { StyleSheet } from "react-native";
import { screen } from "@testing-library/react-native";
import { renderApp } from "./helpers";

jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));
const mockScheme = { value: "dark" as "light" | "dark" };
jest.mock("@/theme/use-scheme", () => ({ useScheme: () => mockScheme.value }));
const mockSonner = jest.fn((_props: Record<string, unknown>) => null);
jest.mock("sonner-native", () => ({ Toaster: (p: Record<string, unknown>) => mockSonner(p), toast: {} }));
jest.mock("expo-router", () => ({ useRouter: () => ({ replace: jest.fn() }), useLocalSearchParams: () => ({ id: "x" }) }));
jest.mock("@/lib/session", () => ({ useAppSession: () => ({ status: "signedIn", orgCount: 0 }) }));
jest.mock("@/lib/org", () => ({ getInvitation: async () => null, acceptInvitation: jest.fn() }));

import { Toaster } from "@/components/ui/toast";
import { UpdateRequired } from "@/components/update-required";
import { SessionError } from "@/components/session-error";
import Convite from "@/app/convite/[id]";

const paddingTop = (el: { props: { style?: unknown; contentContainerStyle?: unknown } }, key: "style" | "contentContainerStyle" = "style") =>
  StyleSheet.flatten(el.props[key] as never)?.paddingTop as number;

describe("avisos (toast)", () => {
  test.each(["light", "dark"] as const)("seguem o tema em uso (%s), não o esquema do sistema", async (scheme) => {
    mockScheme.value = scheme;
    mockSonner.mockClear();
    await renderApp(<Toaster />);
    expect(mockSonner.mock.calls[0][0]).toMatchObject({ theme: scheme });
  });
});

describe("telas fora da casca respeitam a área segura do topo", () => {
  test("atualização obrigatória", async () => {
    await renderApp(<UpdateRequired minVersion="1.2.0" />);
    expect(paddingTop(screen.getByTestId("update-required"))).toBeGreaterThanOrEqual(59);
  });
  test("falha ao carregar as contas", async () => {
    await renderApp(<SessionError onRetry={() => {}} />);
    expect(paddingTop(screen.getByTestId("session-error"))).toBeGreaterThanOrEqual(59);
  });
  test("convite", async () => {
    await renderApp(<Convite />);
    expect(paddingTop(screen.getByTestId("convite-scroll"), "contentContainerStyle")).toBeGreaterThanOrEqual(59 + 16);
  });
});
