import { test, expect, beforeEach } from "vitest";
import { GET } from "@/app/api/cron/dispatch/route";

beforeEach(() => {
  process.env.CRON_SECRET = "segredo";
});

test("sem Authorization responde 401", async () => {
  const res = await GET(new Request("http://x/api/cron/dispatch"));
  expect(res.status).toBe(401);
});

test("com segredo errado responde 401", async () => {
  const res = await GET(new Request("http://x/api/cron/dispatch", { headers: { authorization: "Bearer outro" } }));
  expect(res.status).toBe(401);
});

test("sem CRON_SECRET configurado nunca autoriza", async () => {
  delete process.env.CRON_SECRET;
  const res = await GET(new Request("http://x/api/cron/dispatch", { headers: { authorization: "Bearer undefined" } }));
  expect(res.status).toBe(401);
});

import { vi } from "vitest";
const dispatchMock = vi.hoisted(() => vi.fn(async () => ({ plans: 0, sent: 0, removed: 0 })));
vi.mock("@/lib/services/dispatch", () => ({ dispatchDue: dispatchMock }));
vi.mock("@/lib/db", () => ({ getDb: () => ({}) }));
vi.mock("@/lib/push/sender", () => ({ webPushSender: "web-sender" }));
vi.mock("@/lib/push/expo-sender", () => ({ expoSender: "expo-sender" }));

test("com o segredo certo chama dispatchDue com os dois canais (Web Push e Expo)", async () => {
  const res = await GET(new Request("http://x/api/cron/dispatch", { headers: { authorization: "Bearer segredo" } }));
  expect(res.status).toBe(200);
  expect(dispatchMock).toHaveBeenCalledTimes(1);
  const args = dispatchMock.mock.calls[0] as unknown[];
  expect(args[2]).toBe("web-sender");
  expect(args[3]).toBe("expo-sender");
});
