import { test, expect } from "vitest";
import { inviteLink } from "../src/invites";

test("inviteLink monta a URL do convite", () => {
  expect(inviteLink("abc", "https://x.app")).toBe("https://x.app/convite/abc");
});

test("inviteLink ignora barra final na base", () => {
  expect(inviteLink("abc", "https://x.app/")).toBe("https://x.app/convite/abc");
});
