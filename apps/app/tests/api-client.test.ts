import { ApiClientError, AppOutdatedError, UnauthorizedError } from "@/lib/api/errors";
import { createApiClient } from "@/lib/api/client";
import { queryClient } from "@/lib/api/query";
import { fetchMe } from "@/lib/api/me";
import { appVersion } from "@/lib/version";

const reply = (status: number, body?: unknown) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => {
    if (body === undefined) throw new SyntaxError("sem corpo");
    return body;
  },
});

/** Espera que a promessa rejeite e devolve o erro (falha o teste se ela resolver). */
const failure = (p: Promise<unknown>) =>
  p.then(
    () => { throw new Error("esperava uma falha"); },
    (e: unknown) => e as ApiClientError & AppOutdatedError,
  );

function setup(fetchImpl: jest.Mock, cookie = "better-auth.session_token=abc; Path=/") {
  const client = createApiClient({
    baseUrl: "https://medicron.com.br", getCookie: async () => cookie, appVersion: "1.2.0", fetch: fetchImpl as unknown as typeof fetch,
  });
  return client;
}

describe("createApiClient", () => {
  test("monta a URL com /api/v1 e envia Cookie e x-app-version, sem credenciais do navegador", async () => {
    const f = jest.fn().mockResolvedValue(reply(200, { ok: 1 }));
    expect(await setup(f).request("GET", "/patients")).toEqual({ ok: 1 });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://medicron.com.br/api/v1/patients");
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("omit");
    expect(init.headers).toMatchObject({ Cookie: "better-auth.session_token=abc; Path=/", "x-app-version": "1.2.0" });
    expect(init.headers["content-type"]).toBeUndefined();
  });

  test("com corpo envia JSON", async () => {
    const f = jest.fn().mockResolvedValue(reply(201, { patient: { id: "p" } }));
    await setup(f).request("POST", "/patients", { name: "Izzy" });
    const [, init] = f.mock.calls[0];
    expect(init.body).toBe(JSON.stringify({ name: "Izzy" }));
    expect(init.headers["content-type"]).toBe("application/json");
  });

  test("204 devolve undefined", async () => {
    expect(await setup(jest.fn().mockResolvedValue(reply(204))).request("DELETE", "/patients/1")).toBeUndefined();
  });

  test("sem cookie não envia o cabeçalho Cookie", async () => {
    const f = jest.fn().mockResolvedValue(reply(200, {}));
    await setup(f, "").request("GET", "/config");
    expect(f.mock.calls[0][1].headers.Cookie).toBeUndefined();
  });

  test("401 vira UnauthorizedError", async () => {
    const err = await failure(setup(jest.fn().mockResolvedValue(reply(401, { error: "unauthorized", message: "É preciso entrar." }))).request("GET", "/me"));
    expect(err).toBeInstanceOf(UnauthorizedError);
    expect(err.status).toBe(401);
  });

  test("426 vira AppOutdatedError com a versão mínima", async () => {
    const err = await failure(setup(jest.fn().mockResolvedValue(reply(426, { error: "app_outdated", minAppVersion: "2.0.0" }))).request("GET", "/me"));
    expect(err).toBeInstanceOf(AppOutdatedError);
    expect(err.minAppVersion).toBe("2.0.0");
  });

  test("400 vira ApiClientError com código e issues", async () => {
    const issues = [{ path: ["name"], message: "Informe o nome" }];
    const err = await failure(setup(jest.fn().mockResolvedValue(reply(400, { error: "invalid_request", message: "Dados inválidos.", issues }))).request("POST", "/patients", {}));
    expect(err).toBeInstanceOf(ApiClientError);
    expect(err).toMatchObject({ status: 400, code: "invalid_request", issues });
  });

  test("erro sem corpo JSON ainda vira ApiClientError em português", async () => {
    const err = await failure(setup(jest.fn().mockResolvedValue(reply(502))).request("GET", "/home"));
    expect(err).toBeInstanceOf(ApiClientError);
    expect(err.status).toBe(502);
    expect(err.message).toBe("Algo deu errado. Tente de novo.");
  });

  test("rede caindo vira erro 'network' em português", async () => {
    const err = await failure(setup(jest.fn().mockRejectedValue(new TypeError("Network request failed"))).request("GET", "/home"));
    expect(err).toMatchObject({ status: 0, code: "network", message: "Sem conexão. Verifique a internet e tente de novo." });
  });

  test("o cookie nunca vai para o log", async () => {
    const spies = (["log", "warn", "error", "info", "debug"] as const).map((m) => jest.spyOn(console, m).mockImplementation(() => {}));
    await setup(jest.fn().mockResolvedValue(reply(401, { error: "unauthorized" }))).request("GET", "/me").catch(() => {});
    await setup(jest.fn().mockRejectedValue(new Error("x"))).request("GET", "/me").catch(() => {});
    for (const s of spies) {
      expect(JSON.stringify(s.mock.calls)).not.toContain("session_token");
      s.mockRestore();
    }
  });
});

describe("queryClient", () => {
  const retry = queryClient.getDefaultOptions().queries!.retry as (n: number, e: unknown) => boolean;
  test("não repete erros 4xx (inclui 426: uma tentativa só)", () => {
    expect(retry(0, new AppOutdatedError("2.0.0"))).toBe(false);
    expect(retry(0, new UnauthorizedError())).toBe(false);
    expect(retry(0, new ApiClientError(404, "not_found", "x"))).toBe(false);
  });
  test("repete falhas de rede e 5xx até 2 vezes", () => {
    const net = new ApiClientError(0, "network", "x");
    expect(retry(0, net)).toBe(true);
    expect(retry(1, new ApiClientError(503, "internal", "x"))).toBe(true);
    expect(retry(2, net)).toBe(false);
  });
  test("dados ficam frescos por 30 s", () => {
    expect(queryClient.getDefaultOptions().queries!.staleTime).toBe(30_000);
  });
});

describe("fetchMe e appVersion", () => {
  test("fetchMe chama GET /me", async () => {
    const f = jest.fn().mockResolvedValue(reply(200, { user: { id: "u", name: "Ana", email: "a@x.com" }, orgId: "o", role: "owner" }));
    expect((await fetchMe(setup(f))).orgId).toBe("o");
    expect(f.mock.calls[0][0]).toBe("https://medicron.com.br/api/v1/me");
  });
  test("appVersion devolve a versão do app (N.N.N)", () => {
    expect(appVersion()).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
