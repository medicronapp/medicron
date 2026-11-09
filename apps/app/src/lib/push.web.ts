// Na web o push é o Web Push do navegador (service worker), que vem com a virada da web (Plano 6).
export type PushState = "unsupported" | "denied" | "default" | "enabled";
export const getPushState = async (): Promise<PushState> => "unsupported";
export const enablePush = async (): Promise<"enabled" | "denied" | "no-project"> => "no-project";
export const disablePush = async (): Promise<void> => {};
export const unregisterThisDevice = async (): Promise<void> => {};
export const syncPushRegistration = async (): Promise<void> => {};
