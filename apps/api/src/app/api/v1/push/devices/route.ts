import { z } from "zod";
import { pushDeviceBody } from "@medicron/shared";
import { getDb } from "@/lib/db";
import { getApiUserId } from "@/lib/api/context";
import { json, noContent, readJson, route } from "@/lib/api/route";
import { removeDevice, saveDevice } from "@/lib/services/push";

export const dynamic = "force-dynamic";

/** Cadastra o aparelho (token do Expo) do usuário. Repetir é seguro; o mesmo token de outra pessoa passa a ser dele. */
export const POST = route(async (req) => {
  const userId = await getApiUserId();
  const body = await readJson(req, pushDeviceBody);
  await saveDevice(getDb(), userId, body);
  return json({ ok: true });
});

/** Remove o aparelho do usuário (ao sair da conta ou desativar). Idempotente; não apaga aparelho de outra pessoa. */
export const DELETE = route(async (req) => {
  const userId = await getApiUserId();
  const { token } = await readJson(req, z.object({ token: z.string().min(1) }));
  await removeDevice(getDb(), token, userId);
  return noContent();
});
