import { resolveApiUrl } from "@/lib/api-url";

test("usa a variável quando existe, sem barra final", () => {
  expect(resolveApiUrl("http://localhost:3000/")).toBe("http://localhost:3000");
});
test("sem variável (ou vazia) cai em produção", () => {
  expect(resolveApiUrl(undefined)).toBe("https://medicron.com.br");
  expect(resolveApiUrl("")).toBe("https://medicron.com.br");
});
