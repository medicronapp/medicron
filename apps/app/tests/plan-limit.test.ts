import { createApiClient } from "@/lib/api/client";
import { ApiClientError } from "@/lib/api/errors";
import { isPlanLimit } from "@/lib/plan-limit";

describe("isPlanLimit", () => {
  test("reconhece o 402 plan_limit da API e devolve qual limite foi atingido", () => {
    for (const limit of ["patients", "members", "history"] as const) {
      expect(isPlanLimit(new ApiClientError(402, "plan_limit", "x", undefined, limit))).toEqual({ limit });
    }
  });

  test("reconhece os códigos do better-auth (convidar/aceitar acima do limite de pessoas) como 'members'", () => {
    for (const code of ["INVITATION_LIMIT_REACHED", "ORGANIZATION_MEMBERSHIP_LIMIT_REACHED"]) {
      expect(isPlanLimit(Object.assign(new Error("Invitation limit reached"), { code }))).toEqual({ limit: "members" });
    }
  });

  test("outros erros (rede, 500, 403, null, texto) não são limite de plano", () => {
    expect(isPlanLimit(new ApiClientError(0, "network", "Sem conexão"))).toBeNull();
    expect(isPlanLimit(new ApiClientError(500, "internal", "x"))).toBeNull();
    expect(isPlanLimit(new ApiClientError(402, "outra_coisa", "x"))).toBeNull();
    expect(isPlanLimit(new Error("qualquer"))).toBeNull();
    expect(isPlanLimit(null)).toBeNull();
    expect(isPlanLimit("plan_limit")).toBeNull();
  });
});

describe("o cliente da API leva o limite do corpo do 402 até o erro", () => {
  test("402 com { error: 'plan_limit', limit: 'patients' } vira ApiClientError com limit", async () => {
    const client = createApiClient({
      baseUrl: "https://x", getCookie: async () => "", appVersion: "1.0.0",
      fetch: (async () => new Response(JSON.stringify({ error: "plan_limit", message: "Limite", limit: "patients" }), { status: 402 })) as typeof fetch,
    });
    const err = (await client.request("POST", "/patients", {}).catch((e: unknown) => e)) as ApiClientError;
    expect(err).toBeInstanceOf(ApiClientError);
    expect(isPlanLimit(err)).toEqual({ limit: "patients" });
    expect(err.message).toBe("Limite");
  });
});
