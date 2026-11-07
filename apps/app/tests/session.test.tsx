import { Text } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { useAppSession } from "@/lib/session";
import { queryClient } from "@/lib/api/query";

const mock = {
  session: { data: null as unknown, isPending: false },
  orgs: { data: null as unknown, isPending: false, error: null as unknown, refetch: jest.fn() },
  notify: jest.fn(),
  signOut: jest.fn(async () => ({})),
};
jest.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => mock.session,
    useListOrganizations: () => mock.orgs,
    $store: { notify: (signal: string) => mock.notify(signal) },
    signOut: () => mock.signOut(),
  },
}));

function Probe() {
  const s = useAppSession();
  return (
    <>
      <Text testID="s">{`${s.status}|${s.orgCount}|${s.activeOrgId}`}</Text>
      <Text testID="out" onPress={() => s.signOut()}>sair</Text>
    </>
  );
}
const state = () => screen.getByTestId("s").props.children as string;

beforeEach(() => {
  mock.session = { data: null, isPending: false };
  mock.orgs = { data: null, isPending: false, error: null, refetch: jest.fn() };
  mock.signOut.mockClear();
  mock.notify.mockClear();
});

test("carregando enquanto a sessão (ou a lista de contas, com sessão) não chegou", async () => {
  mock.session = { data: null, isPending: true };
  await render(<Probe />);
  expect(state()).toBe("loading|0|null");
  mock.session = { data: { session: { activeOrganizationId: null } }, isPending: false };
  mock.orgs = { data: null, isPending: true, error: null, refetch: jest.fn() };
  await render(<Probe />);
  expect(screen.getAllByTestId("s").at(-1)!.props.children).toBe("loading|0|null");
});

test("lista de contas ainda não carregada (nula, sem pendência) é carregando, não 'sem conta'", async () => {
  mock.session = { data: { session: { activeOrganizationId: null } }, isPending: false };
  mock.orgs = { data: null, isPending: false, error: null, refetch: jest.fn() };
  await render(<Probe />);
  expect(state()).toBe("loading|0|null");
});

test("sem sessão", async () => {
  await render(<Probe />);
  expect(state()).toBe("signedOut|0|null");
});

test("com sessão: conta ativa e quantidade de contas", async () => {
  mock.session = { data: { session: { activeOrganizationId: "o1" } }, isPending: false };
  mock.orgs = { data: [{ id: "o1" }, { id: "o2" }], isPending: false, error: null, refetch: jest.fn() };
  await render(<Probe />);
  expect(state()).toBe("signedIn|2|o1");
});

test("signOut sai da sessão e esvazia o cache de dados (nada sobra para o próximo usuário)", async () => {
  queryClient.setQueryData(["me"], { orgId: "o1" });
  mock.session = { data: { session: { activeOrganizationId: "o1" } }, isPending: false };
  mock.orgs = { data: [{ id: "o1" }], isPending: false, error: null, refetch: jest.fn() };
  await render(<Probe />);
  await fireEvent.press(screen.getByTestId("out"));
  expect(mock.signOut).toHaveBeenCalledTimes(1);
  expect(queryClient.getQueryData(["me"])).toBeUndefined();
});

test("quando o usuário muda (entrar/sair), manda rebuscar a lista de contas (o better-auth não faz isso sozinho)", async () => {
  mock.session = { data: { user: { id: "u1" }, session: { activeOrganizationId: "o1" } }, isPending: false };
  mock.orgs = { data: [{ id: "o1" }], isPending: false, error: null, refetch: jest.fn() };
  const { rerender } = await render(<Probe />);
  expect(mock.notify).toHaveBeenCalledWith("$listOrg");
  mock.notify.mockClear();
  mock.session = { data: { user: { id: "u2" }, session: { activeOrganizationId: null } }, isPending: false };
  await rerender(<Probe />);
  expect(mock.notify).toHaveBeenCalledWith("$listOrg");
});

test("erro ao carregar a lista de contas não fica em 'carregando': vira erro com nova tentativa", async () => {
  mock.session = { data: { user: { id: "u1" }, session: { activeOrganizationId: null } }, isPending: false };
  mock.orgs = { data: null, isPending: false, error: { status: 500 }, refetch: jest.fn() };
  await render(<Probe />);
  expect(state()).toBe("error|0|null");
});
