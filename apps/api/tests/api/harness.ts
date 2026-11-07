import { createTestDb } from "@/lib/db/test-db";
import type { Db } from "@/lib/db";
import type { OrgContext } from "@/lib/session";

/** Estado compartilhado dos testes de rota: banco em memória, contexto de login e falha simulada. */
export const env: { db: Db; ctx: OrgContext; fail?: Error } = {
  db: undefined as unknown as Db,
  ctx: { userId: "u1", orgId: "o1", role: "owner" },
};

export async function freshDb(): Promise<Db> {
  env.db = await createTestDb();
  env.ctx = { userId: "u1", orgId: "o1", role: "owner" };
  env.fail = undefined;
  return env.db;
}

type Handler<P> = (req: Request, ctx: { params: Promise<P> }) => Promise<Response>;

/** Chama um Route Handler direto, sem servidor. `json` vira o corpo; `params` os parâmetros de rota. */
export async function call<P extends Record<string, string> = Record<string, string>>(
  handler: Handler<P>,
  path: string,
  init: Omit<RequestInit, "body"> & { json?: unknown; rawBody?: string; params?: P } = {},
  // O corpo é JSON arbitrário nos testes; tipar cada resposta só atrapalharia a leitura.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ status: number; body: any; res: Response }> {
  const { json, rawBody, params, headers, ...rest } = init;
  const h = new Headers(headers);
  let body: string | undefined = rawBody;
  if (json !== undefined) { body = JSON.stringify(json); h.set("content-type", "application/json"); }
  const res = await handler(new Request(`http://localhost${path}`, { ...rest, headers: h, body }), {
    params: Promise.resolve((params ?? {}) as P),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, res };
}
