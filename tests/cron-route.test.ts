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
