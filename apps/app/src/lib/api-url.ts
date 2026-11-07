const PRODUCTION = "https://medicron.com.br";

/** Endereço da API: a variável do ambiente (sem barra final) ou, na falta dela, produção. */
export const resolveApiUrl = (value: string | undefined): string => (value ? value.replace(/\/+$/, "") : PRODUCTION);

export const API_URL = resolveApiUrl(process.env.EXPO_PUBLIC_API_URL);
