/** Estado do push neste aparelho. "needs-install" existe só na web (iPhone: o Web Push exige o app na tela de início). */
export type PushState = "unsupported" | "needs-install" | "denied" | "default" | "enabled";
