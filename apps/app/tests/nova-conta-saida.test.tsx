import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderApp } from "./helpers";

jest.mock("expo-router", () => ({ useRouter: () => ({ replace: jest.fn() }) }));
jest.mock("@/lib/auth-client", () => ({ authClient: { organization: {}, deleteUser: jest.fn() } }));
jest.mock("@/lib/push", () => ({ unregisterThisDevice: jest.fn(async () => {}) }));
const mockSignOut = jest.fn(async () => {});
jest.mock("@/lib/session", () => ({ useAppSession: () => ({ status: "signedIn", orgCount: 0, activeOrgId: null, signOut: mockSignOut }) }));

import NovaConta from "@/app/nova-conta";

test("quem não tem nenhuma conta ainda pode sair e excluir o próprio acesso", async () => {
  await renderApp(<NovaConta />);
  expect(screen.getByRole("button", { name: "Excluir minha conta" })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Sair" }));
  await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
});
