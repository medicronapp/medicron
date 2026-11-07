const mockGetCookie = jest.fn(async () => "better-auth.session_token=abc");
jest.mock("@/lib/auth-client", () => ({ authClient: { getCookie: () => mockGetCookie() } }));

const reply = { status: 200, ok: true, json: async () => ({}) };

function load(os: "web" | "ios") {
  jest.resetModules();
  jest.doMock("@/lib/version", () => ({ appVersion: () => "1.0.0" }));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("react-native").Platform.OS = os;
  const fetchSpy = jest.fn().mockResolvedValue(reply);
  (global as unknown as { fetch: unknown }).fetch = fetchSpy;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { apiClient } = require("@/lib/api");
  return { apiClient, fetchSpy };
}

beforeEach(() => mockGetCookie.mockClear());

test("web: usa o cookie do navegador (include) e nem toca no SecureStore", async () => {
  const { apiClient, fetchSpy } = load("web");
  await apiClient.request("GET", "/me");
  expect(mockGetCookie).not.toHaveBeenCalled();
  expect(fetchSpy.mock.calls[0][1].credentials).toBe("include");
});

test("nativo: manda o cookie do cofre à mão (omit)", async () => {
  const { apiClient, fetchSpy } = load("ios");
  await apiClient.request("GET", "/me");
  expect(mockGetCookie).toHaveBeenCalled();
  expect(fetchSpy.mock.calls[0][1].credentials).toBe("omit");
  expect(fetchSpy.mock.calls[0][1].headers.Cookie).toContain("session_token");
});
