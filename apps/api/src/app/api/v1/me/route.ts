import { eq } from "drizzle-orm";
import type { MeDto } from "@medicron/shared";
import { getDb } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { NotFound } from "@/lib/errors";
import { getApiContext } from "@/lib/api/context";
import { json, route } from "@/lib/api/route";
import { getSubscription } from "@/lib/services/subscription";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const ctx = await getApiContext();
  const [u] = await getDb().select({ id: user.id, name: user.name, email: user.email })
    .from(user).where(eq(user.id, ctx.userId)).limit(1);
  if (!u) throw new NotFound("Usuário");
  const subscription = await getSubscription(getDb(), ctx.orgId, new Date());
  const me: MeDto = { user: u, orgId: ctx.orgId, role: ctx.role, subscription };
  return json(me);
});
