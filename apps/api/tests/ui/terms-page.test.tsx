// @vitest-environment jsdom
import { afterEach, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "@/app/termos/page";

afterEach(() => { delete process.env.CONTACT_EMAIL; });

test("é pública, em português, com título, data e as seções que a assinatura exige", () => {
  render(<Page />);
  expect(screen.getByRole("heading", { level: 1, name: "Termos de uso" })).toBeInTheDocument();
  expect(screen.getByText(/Última atualização/)).toBeInTheDocument();
  for (const h of ["O que é o Medicron", "O que é grátis e o que é Medicron Plus", "Assinatura, cobrança e renovação", "Teste grátis de 7 dias", "Como cancelar", "Reembolsos", "Não é dispositivo médico", "Sua conta e seus dados", "Mudanças nestes termos", "Lei aplicável e contato"]) {
    expect(screen.getByRole("heading", { level: 2, name: h })).toBeInTheDocument();
  }
});

test("diz o que a loja exige: assinatura renovável automaticamente, cobrada pela loja, como cancelar e o teste de 7 dias", () => {
  render(<Page />);
  const text = (document.body.textContent ?? "").toLowerCase();
  for (const t of ["renovada automaticamente", "cobrada pela app store ou pelo google play", "ajustes da app store", "google play", "7 dias", "cancele pelo menos 24 horas antes", "mensal", "anual", "medicron plus"]) {
    expect(text, t).toContain(t);
  }
});

test("garante o essencial grátis e o que é do Plus (os mesmos limites do app)", () => {
  render(<Page />);
  const text = document.body.textContent ?? "";
  for (const t of ["lembretes", "marcar doses", "2 pacientes", "2 pessoas", "30 dias", "ilimitados", "8 pessoas"]) expect(text.toLowerCase()).toContain(t);
  expect(text.toLowerCase()).toContain("nunca cobramos para você receber um lembrete");
});

test("avisa que não é dispositivo médico e que a assinatura não é cancelada ao excluir a conta", () => {
  render(<Page />);
  const text = document.body.textContent ?? "";
  expect(text.toLowerCase()).toContain("não faz diagnóstico nem indica doses ou tratamentos");
  expect(text.toLowerCase()).toContain("excluir a conta não cancela a cobrança");
});

test("cita a lei brasileira (CDC) e usa o e-mail de contato quando configurado", () => {
  process.env.CONTACT_EMAIL = "suporte@medicron.com.br";
  render(<Page />);
  expect(document.body.textContent).toContain("Código de Defesa do Consumidor");
  expect(screen.getByRole("link", { name: "suporte@medicron.com.br" })).toHaveAttribute("href", "mailto:suporte@medicron.com.br");
});

test("sem e-mail configurado não quebra e manda para o app", () => {
  render(<Page />);
  expect(screen.queryByRole("link", { name: /@/ })).toBeNull();
  expect(document.body.textContent).toContain("pelo próprio app");
});
