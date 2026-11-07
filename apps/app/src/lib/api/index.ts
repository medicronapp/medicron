import { appVersion } from "@/lib/version";
import { API_URL } from "@/lib/api-url";
import { authClient } from "@/lib/auth-client";
import { createApiClient } from "./client";

/** Cliente único da API: o cookie vem do cliente de login a cada chamada. */
export const apiClient = createApiClient({
  baseUrl: API_URL,
  getCookie: async () => authClient.getCookie(),
  appVersion: appVersion(),
});
