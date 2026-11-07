import { appVersion } from "@/lib/version";
import { authClient } from "@/lib/auth-client";
import { createApiClient } from "./client";

/** Cliente único da API: o cookie vem do cliente de login a cada chamada. */
export const apiClient = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "https://medicron.com.br",
  getCookie: async () => authClient.getCookie(),
  appVersion: appVersion(),
});
