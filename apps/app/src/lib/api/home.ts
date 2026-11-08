import type { DoseBody, HomeDto, OnboardingDto } from "@medicron/shared";
import type { ApiClient } from "./client";
import { ApiClientError } from "./errors";

export type HomeResponse = { home: HomeDto; hasPatients: boolean; onboarding: OnboardingDto };
export type DoseResult = { recorded: true } | { recorded: false; reason: "already" | "too-early" | "invalid-time" };

export const fetchHome = (client: ApiClient, dia?: string) =>
  client.request<HomeResponse>("GET", dia ? `/home?dia=${encodeURIComponent(dia)}` : "/home");

/** Registra uma dose. "Antes da hora" e "hora inválida" não são falhas: voltam como motivo para a tela avisar. */
export async function recordDose(client: ApiClient, body: DoseBody): Promise<DoseResult> {
  try {
    const res = await client.request<{ recorded: boolean; reason?: "already" }>("POST", "/doses", body);
    return res.recorded ? { recorded: true } : { recorded: false, reason: "already" };
  } catch (err) {
    if (err instanceof ApiClientError && err.code === "too_early") return { recorded: false, reason: "too-early" };
    if (err instanceof ApiClientError && err.code === "invalid_applied_at") return { recorded: false, reason: "invalid-time" };
    throw err;
  }
}

export const completeWelcome = (client: ApiClient) => client.request<void>("POST", "/onboarding/welcome");
export const dismissChecklist = (client: ApiClient) => client.request<void>("POST", "/onboarding/checklist/dismiss");
