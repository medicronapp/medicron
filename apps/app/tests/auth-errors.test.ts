import { loginErrorMessage } from "@/lib/auth-errors";
import { NETWORK_MESSAGE } from "@/lib/api/errors";

test("401/400 e erro sem status: e-mail ou senha incorretos", () => {
  expect(loginErrorMessage({ status: 401 })).toBe("E-mail ou senha incorretos.");
  expect(loginErrorMessage({ status: 400 })).toBe("E-mail ou senha incorretos.");
  expect(loginErrorMessage({ message: "x" })).toBe("E-mail ou senha incorretos.");
});
test("429: muitas tentativas", () => {
  expect(loginErrorMessage({ status: 429 })).toBe("Muitas tentativas. Aguarde um instante e tente de novo.");
});
test("sem resposta (status 0) ou falha de servidor: não culpa a senha", () => {
  expect(loginErrorMessage({ status: 0 })).toBe(NETWORK_MESSAGE);
  expect(loginErrorMessage({ status: 500 })).toBe("Algo deu errado. Tente de novo.");
  expect(loginErrorMessage({ status: 403 })).toBe("Algo deu errado. Tente de novo.");
});
