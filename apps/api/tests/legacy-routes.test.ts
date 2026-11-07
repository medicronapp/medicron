import { expect, test } from "vitest";
import nextConfig from "../next.config";

test("rotas antigas /gatos redirecionam para /pacientes, com subcaminhos", async () => {
  const rules = (await nextConfig.redirects?.()) ?? [];
  expect(rules).toContainEqual({ source: "/gatos", destination: "/pacientes", permanent: true });
  expect(rules).toContainEqual({ source: "/gatos/:path*", destination: "/pacientes/:path*", permanent: true });
});
