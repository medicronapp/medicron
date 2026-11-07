import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

const baseURL = process.env.EXPO_PUBLIC_API_URL;

/** Login por e-mail e senha, organizações e cookie guardado no cofre do aparelho (SecureStore). */
export const authClient = createAuthClient({
  baseURL,
  plugins: [
    organizationClient(),
    expoClient({ scheme: "medicron", storagePrefix: "medicron", storage: SecureStore }),
  ],
});
