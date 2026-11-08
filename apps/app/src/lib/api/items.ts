import type { ItemDto } from "@medicron/shared";
import type { ApiClient } from "./client";

export const fetchItems = async (c: ApiClient) => (await c.request<{ items: ItemDto[] }>("GET", "/items")).items;
