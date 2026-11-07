import { NETWORK_MESSAGE } from "@/lib/api/errors";

type AuthFailure = { status?: number; message?: string };

/** Mensagem para uma falha do better-auth: só culpa a senha/dados quando o servidor de fato respondeu isso. */
export function authFailureMessage(error: AuthFailure, fallback: string): string {
  if (error.status === 429) return "Muitas tentativas. Aguarde um instante e tente de novo.";
  if (error.status === 0) return NETWORK_MESSAGE;
  if (error.status === 403 || (error.status !== undefined && error.status >= 500)) return "Algo deu errado. Tente de novo.";
  return fallback;
}

export const loginErrorMessage = (error: AuthFailure) => authFailureMessage(error, "E-mail ou senha incorretos.");
