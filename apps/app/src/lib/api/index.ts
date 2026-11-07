import { Platform } from "react-native";
import { API_URL } from "@/lib/api-url";
import { appVersion } from "@/lib/version";
import { authClient } from "@/lib/auth-client";
import { createApiClient } from "./client";

const isWeb = Platform.OS === "web";

/**
 * Cliente único da API. No nativo o cookie vem do cofre do aparelho a cada chamada; na web (mesma origem da API)
 * quem manda o cookie é o navegador, e o SecureStore nem existe.
 */
export const apiClient = createApiClient({
  baseUrl: API_URL,
  getCookie: async () => (isWeb ? "" : authClient.getCookie()),
  appVersion: appVersion(),
  credentials: isWeb ? "include" : "omit",
});
