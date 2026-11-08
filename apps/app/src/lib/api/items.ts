import type { ItemBody, ItemDto } from "@medicron/shared";
import type { ApiClient } from "./client";

export type ItemKind = ItemDto["kind"];

export const fetchItems = async (c: ApiClient, kind?: ItemKind) =>
  (await c.request<{ items: ItemDto[] }>("GET", kind ? `/items?kind=${kind}` : "/items")).items;
export const fetchItem = async (c: ApiClient, id: string) => (await c.request<{ item: ItemDto }>("GET", `/items/${id}`)).item;
export const createItem = async (c: ApiClient, body: ItemBody) => (await c.request<{ item: ItemDto }>("POST", "/items", body)).item;
export const updateItem = async (c: ApiClient, id: string, body: ItemBody) => (await c.request<{ item: ItemDto }>("PATCH", `/items/${id}`, body)).item;
export const archiveItem = (c: ApiClient, id: string) => c.request<void>("DELETE", `/items/${id}`);
