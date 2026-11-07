import { json, minAppVersion, route } from "@/lib/api/route";

export const dynamic = "force-dynamic";

/** Público: o app consulta antes de entrar para saber se precisa atualizar. */
export const GET = route(async () => json({ minAppVersion: minAppVersion() }), { gate: false });
