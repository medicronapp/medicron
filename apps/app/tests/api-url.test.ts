import { resolveApiUrl } from "@/lib/api-url";

test("usa a variável quando existe, sem barra final", () => {
  expect(resolveApiUrl("http://localhost:3000/")).toBe("http://localhost:3000");
});
test("sem variável (ou vazia) cai em produção", () => {
  expect(resolveApiUrl(undefined)).toBe("https://medicron.com.br");
  expect(resolveApiUrl("")).toBe("https://medicron.com.br");
});

import { inviteBase } from "@/lib/api-url";

test("na web, sem variável, a API é do mesmo domínio (caminhos relativos)", () => {
  expect(resolveApiUrl(undefined, "web")).toBe("");
  expect(resolveApiUrl("", "web")).toBe("");
  expect(resolveApiUrl(undefined, "ios")).toBe("https://medicron.com.br");
  expect(resolveApiUrl("http://x/", "web")).toBe("http://x");
});
test("o link de convite usa a origem da página quando a API é relativa", () => {
  expect(inviteBase("", "https://medicron.com.br")).toBe("https://medicron.com.br");
  expect(inviteBase("http://localhost:3000", "https://outra")).toBe("http://localhost:3000");
});
