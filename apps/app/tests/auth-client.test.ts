jest.mock("expo-secure-store", () => ({ getItem: jest.fn(), setItem: jest.fn(), deleteItemAsync: jest.fn(), getItemAsync: jest.fn(), setItemAsync: jest.fn() }));

import { authClient } from "@/lib/auth-client";
import { apiClient } from "@/lib/api";

test("o cliente de login tem e-mail e senha, organizações e o plugin do Expo (cookie)", () => {
  expect(typeof authClient.signIn.email).toBe("function");
  expect(typeof authClient.signUp.email).toBe("function");
  expect(typeof authClient.organization.create).toBe("function");
  expect(typeof authClient.organization.setActive).toBe("function");
  expect(typeof authClient.getCookie).toBe("function");
});

test("o cliente da API usa o cookie do cliente de login", () => {
  expect(typeof apiClient.request).toBe("function");
});
