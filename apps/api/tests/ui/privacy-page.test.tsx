// @vitest-environment jsdom
import { afterEach, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "@/app/privacidade/page";

afterEach(() => { delete process.env.CONTACT_EMAIL; });

test("é pública, em português, com título, data e as seções que as lojas pedem", () => {
  render(<Page />);
  expect(screen.getByRole("heading", { level: 1, name: "Política de privacidade" })).toBeInTheDocument();
  expect(screen.getByText(/Última atualização/)).toBeInTheDocument();
  for (const h of ["Quem somos", "Que dados coletamos e para quê", "Com quem compartilhamos", "Por quanto tempo guardamos", "Como excluir seus dados", "Seus direitos", "Crianças e menores", "Mudanças nesta política"]) {
    expect(screen.getByRole("heading", { level: 2, name: h })).toBeInTheDocument();
  }
});

test("descreve o que o app realmente guarda e como excluir pelo app", () => {
  render(<Page />);
  const text = document.body.textContent ?? "";
  for (const t of ["nome e e-mail", "pacientes", "token de notificação", "cookie de sessão", "Conta → Excluir conta", "LGPD"]) {
    expect(text.toLowerCase()).toContain(t.toLowerCase());
  }
  for (const provider of ["Vercel", "Neon", "Expo"]) expect(text).toContain(provider);
  expect(text.toLowerCase()).toContain("não vendemos");
});

test("usa o e-mail de contato quando configurado e tem texto alternativo quando não", () => {
  process.env.CONTACT_EMAIL = "privacidade@medicron.com.br";
  const { unmount } = render(<Page />);
  expect(screen.getByRole("link", { name: "privacidade@medicron.com.br" })).toHaveAttribute("href", "mailto:privacidade@medicron.com.br");
  unmount();
  delete process.env.CONTACT_EMAIL;
  render(<Page />);
  expect(screen.queryByRole("link", { name: /@/ })).toBeNull();
  expect(document.body.textContent).toContain("pelo próprio app");
});

test("diz a verdade sobre a senha, o push do navegador e como avisa mudanças", () => {
  render(<Page />);
  const text = document.body.textContent ?? "";
  expect(text).not.toMatch(/criptografada/i);
  expect(text).toMatch(/hash|protegida de forma irreversível/i);
  expect(text).toMatch(/serviços de push dos navegadores/i);
  expect(text).not.toMatch(/avisamos no app/i);
  expect(text).toMatch(/atualizamos a data/i);
});

test("tem a seção 'Compras e assinatura': a loja cobra, o RevenueCat confirma, guardamos só plano e validade, sem dados de cartão", () => {
  render(<Page />);
  expect(screen.getByRole("heading", { level: 2, name: "Compras e assinatura" })).toBeInTheDocument();
  const text = document.body.textContent ?? "";
  for (const t of ["Medicron Plus", "Apple ou pelo Google", "RevenueCat", "plano e a validade", "não guardamos dados de cartão"]) expect(text).toContain(t);
});

test("o RevenueCat também aparece em 'Com quem compartilhamos' e a data da política foi atualizada", () => {
  render(<Page />);
  const section = screen.getByRole("heading", { level: 2, name: "Com quem compartilhamos" }).parentElement!;
  expect(section.textContent).toContain("RevenueCat");
  expect(screen.getByText(/Última atualização: 10 de novembro de 2026/)).toBeInTheDocument();
});
