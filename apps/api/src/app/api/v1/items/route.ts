import { z } from "zod";
import { itemBody } from "@medicron/shared";
import { getDb } from "@/lib/db";
import { getApiContext } from "@/lib/api/context";
import { toItemDto } from "@/lib/api/dto";
import { json, readJson, route } from "@/lib/api/route";
import { createItem, listItems } from "@/lib/services/items";

export const dynamic = "force-dynamic";

const kindQuery = z.enum(["medication", "procedure"]).optional();

export const GET = route(async (req) => {
  const { orgId } = await getApiContext();
  const kind = kindQuery.parse(new URL(req.url).searchParams.get("kind") ?? undefined);
  const items = await listItems(getDb(), orgId, kind);
  return json({ items: items.map(toItemDto) });
});

export const POST = route(async (req) => {
  const { orgId } = await getApiContext();
  const body = await readJson(req, itemBody);
  const item = await createItem(getDb(), orgId, body);
  return json({ item: toItemDto(item) }, 201);
});
