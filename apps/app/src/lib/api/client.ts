import { API_PREFIX, type ErrorDto } from "@medicron/shared";
import { ApiClientError, AppOutdatedError, NETWORK_MESSAGE, UnauthorizedError } from "./errors";

export type ApiClientOptions = {
  baseUrl: string;
  /** Cookie de sessão do `better-auth` (no celular não há cookie de navegador: vai no cabeçalho). */
  getCookie: () => Promise<string>;
  appVersion: string;
  fetch?: typeof fetch;
};

export type ApiClient = ReturnType<typeof createApiClient>;

/** Cliente fino da API `/api/v1`: injeta cookie e versão do app e converte erros em classes tipadas. */
export function createApiClient({ baseUrl, getCookie, appVersion, fetch: fetchImpl = fetch }: ApiClientOptions) {
  async function request<T>(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
    const cookie = await getCookie();
    const headers: Record<string, string> = { "x-app-version": appVersion };
    if (cookie) headers.Cookie = cookie;
    if (body !== undefined) headers["content-type"] = "application/json";

    let res: Awaited<ReturnType<typeof fetch>>;
    try {
      res = await fetchImpl(`${baseUrl}${API_PREFIX}${path}`, {
        method,
        headers,
        credentials: "omit", // 'include' sobrescreve o Cookie que enviamos à mão
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiClientError(0, "network", NETWORK_MESSAGE);
    }

    if (res.status === 204) return undefined as T;
    const data: unknown = await res.json().catch(() => null);
    if (res.ok) return data as T;

    const dto = (data ?? {}) as Partial<ErrorDto>;
    if (res.status === 426) throw new AppOutdatedError(dto.minAppVersion ?? "", dto.message);
    if (res.status === 401) throw new UnauthorizedError(dto.message);
    throw new ApiClientError(res.status, dto.error ?? "unknown", dto.message ?? "Algo deu errado. Tente de novo.", dto.issues);
  }
  return { request };
}
