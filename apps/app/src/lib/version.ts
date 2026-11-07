import Constants from "expo-constants";

/** Versão do app (N.N.N), a mesma enviada em `x-app-version` para a API conferir a versão mínima. */
export const appVersion = (): string => Constants.expoConfig?.version ?? "0.0.0";
