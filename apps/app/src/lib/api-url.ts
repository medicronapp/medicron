import { Platform } from "react-native";

const PRODUCTION = "https://medicron.com.br";

/**
 * Endereço da API: a variável do ambiente (sem barra final). Sem ela, a web usa o mesmo domínio ("" = caminhos
 * relativos, sem CORS; o projeto estático reescreve `/api/*` para a API) e os apps nativos usam produção.
 */
export const resolveApiUrl = (value: string | undefined, platform: string = Platform.OS): string => {
  if (value) return value.replace(/\/+$/, "");
  return platform === "web" ? "" : PRODUCTION;
};

export const API_URL = resolveApiUrl(process.env.EXPO_PUBLIC_API_URL);

/** Base absoluta para montar links (convite): a API, ou a origem da página quando a API é relativa. */
export const inviteBase = (
  apiUrl: string = API_URL,
  origin: string | undefined = typeof window !== "undefined" ? window.location?.origin : undefined,
): string => apiUrl || origin || PRODUCTION;
