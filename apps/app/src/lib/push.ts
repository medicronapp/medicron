import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { apiClient } from "@/lib/api";
import { registerDevice, unregisterDevice } from "@/lib/api/push";

const TOKEN_KEY = "medicron.pushToken"; // token registrado por este aparelho (para poder desregistrar)
const OPT_OUT_KEY = "medicron.pushOptOut"; // o usuário desativou: a sincronização automática não reativa
const UNREGISTER_TIMEOUT_MS = 3000;

export type PushState = "unsupported" | "denied" | "default" | "enabled";

/** `projectId` do EAS (vem do `app.json`, definido por `eas init`); sem ele o Expo não emite token. */
const projectId = (): string | undefined => {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId;
};

const platform = (): "ios" | "android" => (Platform.OS === "android" ? "android" : "ios");

/** Estado do push neste aparelho. "enabled" = permissão concedida **e** token registrado aqui. */
export async function getPushState(): Promise<PushState> {
  if (Platform.OS === "web" || !projectId()) return "unsupported";
  const perm = await Notifications.getPermissionsAsync();
  // "denied" só quando não dá mais para perguntar; no Android a primeira recusa ainda permite pedir de novo.
  if (perm.status === "denied" && !perm.canAskAgain) return "denied";
  if (!perm.granted) return "default";
  return (await SecureStore.getItemAsync(TOKEN_KEY)) ? "enabled" : "default";
}

async function registerCurrentToken(): Promise<void> {
  const id = projectId();
  if (!id) return;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", { name: "Lembretes", importance: AndroidImportance.HIGH });
  }
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
  await registerDevice(apiClient, token, platform());
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

/** Pede a permissão (se preciso), registra o aparelho e guarda o token. Lança se o registro falhar (rede). */
export async function enablePush(): Promise<"enabled" | "denied" | "no-project"> {
  if (!projectId()) return "no-project";
  let perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) {
    if (perm.status === "denied" && !perm.canAskAgain) return "denied";
    perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return "denied";
  }
  await registerCurrentToken();
  await SecureStore.deleteItemAsync(OPT_OUT_KEY);
  return "enabled";
}

/** Desregistra o token guardado e o apaga daqui. Nunca lança (sem rede, o servidor limpa quando o Expo disser que o token morreu). */
async function removeStoredToken(): Promise<void> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
  if (!token) return;
  // Apaga a chave antes da rede: quem entrar logo depois (ou uma chamada lenta) não vê um token velho como se fosse seu.
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
  try {
    await unregisterDevice(apiClient, token);
  } catch {
    // sem rede ou sessão já expirada
  }
}

/** O usuário desativou os avisos neste aparelho: desregistra e lembra a escolha (a sincronização não reativa). */
export async function disablePush(): Promise<void> {
  await SecureStore.setItemAsync(OPT_OUT_KEY, "1").catch(() => {});
  await removeStoredToken();
}

/** Ao sair da conta: desregistra o aparelho (com limite de tempo; sair nunca pode travar nem falhar por isso). */
export async function unregisterThisDevice(): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<void>((resolve) => { timer = setTimeout(resolve, UNREGISTER_TIMEOUT_MS); });
  try {
    await Promise.race([removeStoredToken(), limit]);
  } catch {
    // nunca lança
  } finally {
    clearTimeout(timer);
  }
}

/** Para a sincronização: registra de novo se a permissão já existe, o usuário não desativou e o token mudou. */
export async function syncPushRegistration(): Promise<void> {
  if (Platform.OS === "web" || !projectId()) return;
  if (await SecureStore.getItemAsync(OPT_OUT_KEY)) return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return; // a sincronização nunca pede permissão
  const id = projectId()!;
  const { data: current } = await Notifications.getExpoPushTokenAsync({ projectId: id });
  if (current === (await SecureStore.getItemAsync(TOKEN_KEY))) return;
  await registerCurrentToken();
}
