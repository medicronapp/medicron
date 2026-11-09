import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { loadOrgContext, type OrgContext } from "@/lib/session";
import { ApiError } from "./errors";

export { ApiError };

/** Como `getOrgContext`, mas para a API: sem sessão responde 401 e sem conta 403, nunca redireciona. */
export async function getApiContext(): Promise<OrgContext> {
  const r = await loadOrgContext();
  if (r.ok) return r.ctx;
  if (r.reason === "no_session") throw new ApiError(401, "unauthorized", "É preciso entrar para continuar.");
  throw new ApiError(403, "no_organization", "Crie ou aceite uma conta para continuar.");
}

/** Só a sessão (401 sem login), sem exigir conta ativa: para o que não depende de organização, como o aparelho de push. */
export async function getApiUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new ApiError(401, "unauthorized", "É preciso entrar para continuar.");
  return session.user.id;
}
