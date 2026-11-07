import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "@/lib/api-url";


/** Login por e-mail e senha, organizações e cookie guardado no cofre do aparelho (SecureStore). */
export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    organizationClient(),
    expoClient({ scheme: "medicron", storagePrefix: "medicron", storage: SecureStore }),
  ],
});
