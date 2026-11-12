import { ZodError, type ZodType } from "zod";
import { compareVersions } from "@medicron/shared";
import { NotFound } from "@/lib/errors";
import { Forbidden } from "@/lib/tenancy";
import { InvalidAppliedAt, TooEarly } from "@/lib/services/slots";
import { ApiError } from "./errors";

export const json = (body: unknown, status = 200) => Response.json(body, { status });
export const noContent = () => new Response(null, { status: 204 });

/** Regras de data final dos serviços de rotina viram 422 (hoje são `Error` genéricos com esta mensagem). */
export function endDateError(err: unknown): never {
  if (err instanceof Error && err.message.startsWith("A data final")) {
    throw new ApiError(422, "end_before_next_dose", err.message);
  }
  throw err;
}

/** Versão mínima aceita. Valor malformado no ambiente não pode tirar todos os clientes do ar: cai em 0.0.0 e registra. */
export const minAppVersion = () => {
  const v = process.env.MIN_APP_VERSION ?? "0.0.0";
  try {
    compareVersions(v, "0.0.0");
    return v;
  } catch {
    console.error("MIN_APP_VERSION inválida; usando 0.0.0", v);
    return "0.0.0";
  }
};

type Ctx<P> = { params: Promise<P> };

/** Lê e valida o corpo JSON. JSON malformado e campos inválidos viram 400 (`invalid_request`). */
export async function readJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "invalid_request", "Corpo da requisição inválido.");
  }
  return schema.parse(body);
}

function checkAppVersion(req: Request): Response | null {
  const v = req.headers.get("x-app-version");
  if (v === null) return null; // a web não envia o cabeçalho
  try {
    if (compareVersions(v, minAppVersion()) >= 0) return null;
  } catch {
    return json({ error: "invalid_app_version", message: "Versão do app inválida." }, 400);
  }
  return json({ error: "app_outdated", message: "Atualize o app para continuar.", minAppVersion: minAppVersion() }, 426);
}

function errorResponse(err: unknown): Response {
  if (err instanceof ApiError) return json({ error: err.code, message: err.message, ...err.details }, err.status);
  if (err instanceof ZodError) {
    return json({ error: "invalid_request", message: "Dados inválidos.", issues: err.issues }, 400);
  }
  if (err instanceof NotFound) return json({ error: "not_found", message: err.message }, 404);
  if (err instanceof Forbidden) return json({ error: "forbidden", message: err.message }, 403);
  if (err instanceof TooEarly) return json({ error: "too_early", message: err.message }, 409);
  if (err instanceof InvalidAppliedAt) return json({ error: "invalid_applied_at", message: err.message }, 422);
  console.error("api error", err);
  return json({ error: "internal" }, 500);
}

/** Envolve um Route Handler: confere a versão do app e converte qualquer erro em JSON conforme o contrato. */
export function route<P extends Record<string, string> = Record<string, string>>(
  handler: (req: Request, ctx: Ctx<P>) => Promise<Response>,
  opts: { gate?: boolean } = {},
) {
  return async (req: Request, ctx: Ctx<P>): Promise<Response> => {
    try {
      const blocked = opts.gate === false ? null : checkAppVersion(req);
      return blocked ?? (await handler(req, ctx));
    } catch (err) {
      return errorResponse(err);
    }
  };
}
