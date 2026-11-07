import type { MeDto } from "@medicron/shared";
import type { ApiClient } from "./client";

export const fetchMe = (client: ApiClient) => client.request<MeDto>("GET", "/me");
