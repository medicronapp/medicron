import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { removeSubscription, saveSubscription } from "@/lib/services/push";

const subSchema = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

async function userId() {
  const s = await auth.api.getSession({ headers: await headers() });
  return s?.user.id ?? null;
}

export async function POST(req: Request) {
  const uid = await userId();
  if (!uid) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const parsed = subSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Inscrição inválida" }, { status: 400 });
  await saveSubscription(getDb(), uid, parsed.data);
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const uid = await userId();
  if (!uid) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const body = z.object({ endpoint: z.url() }).safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Requisição inválida" }, { status: 400 });
  await removeSubscription(getDb(), body.data.endpoint);
  return Response.json({ ok: true });
}
