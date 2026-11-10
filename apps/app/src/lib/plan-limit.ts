import { ApiClientError } from "@/lib/api/errors";

export type PlanLimit = { limit: "patients" | "members" | "history" };

/** Códigos do `better-auth` quando convidar ou aceitar pessoa passa do limite do plano. */
const MEMBER_LIMIT_CODES = new Set(["INVITATION_LIMIT_REACHED", "ORGANIZATION_MEMBERSHIP_LIMIT_REACHED"]);

/**
 * O erro é "chegou ao limite do plano grátis"? Reconhece o 402 `plan_limit` da API (com qual limite) e os códigos do
 * `better-auth` para pessoas. Devolve `null` para qualquer outro erro. As telas respondem a isto abrindo o paywall.
 */
export function isPlanLimit(error: unknown): PlanLimit | null {
  if (error instanceof ApiClientError) {
    return error.code === "plan_limit" && error.limit ? { limit: error.limit } : null;
  }
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && MEMBER_LIMIT_CODES.has(code) ? { limit: "members" } : null;
}
