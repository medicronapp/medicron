import { itemBody } from "@medicron/shared";
import { getDb } from "@/lib/db";
import { getApiContext } from "@/lib/api/context";
import { toItemDto } from "@/lib/api/dto";
import { json, noContent, readJson, route } from "@/lib/api/route";
import { NotFound } from "@/lib/errors";
import { archiveItem, getItem, updateItem } from "@/lib/services/items";

export const dynamic = "force-dynamic";

type P = { id: string };

export const GET = route<P>(async (_req, { params }) => {
  const { orgId } = await getApiContext();
  const item = await getItem(getDb(), orgId, (await params).id);
  if (!item) throw new NotFound("Item");
  return json({ item: toItemDto(item) });
});

export const PATCH = route<P>(async (req, { params }) => {
  const { orgId } = await getApiContext();
  const body = await readJson(req, itemBody);
  const item = await updateItem(getDb(), orgId, (await params).id, body);
  if (!item) throw new NotFound("Item");
  return json({ item: toItemDto(item) });
});

export const DELETE = route<P>(async (_req, { params }) => {
  const { orgId } = await getApiContext();
  await archiveItem(getDb(), orgId, (await params).id);
  return noContent();
});
