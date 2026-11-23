import { describe, expect, test, vi } from "vitest";
import { sendMail } from "@/lib/email/send";
import { resetPasswordEmail } from "@/lib/email/reset-password";

describe("resetPasswordEmail", () => {
  const mail = resetPasswordEmail({ name: "Ana", link: "https://medicron.com.br/redefinir-senha?token=abc" });
  test("assunto em português e o link no botão e no texto simples", () => {
    expect(mail.subject).toBe("Criar uma nova senha no Medicron");
    expect(mail.html).toContain('href="https://medicron.com.br/redefinir-senha?token=abc"');
    expect(mail.html).toContain("Criar nova senha");
    expect(mail.text).toContain("https://medicron.com.br/redefinir-senha?token=abc");
  });
  test("avisa que vale 1 hora e que dá para ignorar se a pessoa não pediu", () => {
    expect(mail.text).toContain("1 hora");
    expect(mail.text).toMatch(/não foi você/i);
  });
  test("o nome é escapado (nada de HTML injetado pelo cadastro)", () => {
    const m = resetPasswordEmail({ name: '<img src=x onerror=alert(1)>', link: "https://medicron.com.br/redefinir-senha?token=abc" });
    expect(m.html).not.toContain("<img");
    expect(m.html).toContain("&lt;img");
  });
  test("o link também é escapado no HTML", () => {
    const m = resetPasswordEmail({ name: "Ana", link: 'https://x.test/?a="><script>' });
    expect(m.html).not.toContain("<script>");
  });
});

describe("sendMail (Resend)", () => {
  const mail = { to: "ana@teste.local", subject: "Oi", html: "<p>oi</p>", text: "oi" };
  test("envia pela API da Resend com a chave, o remetente e o destinatário", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "m1" }), { status: 200 }));
    await sendMail(mail, { RESEND_API_KEY: "re_chave" }, fetchMock as unknown as typeof fetch);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer re_chave");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ from: "Medicron <nao-responda@medicron.com.br>", to: ["ana@teste.local"], subject: "Oi", html: "<p>oi</p>", text: "oi" });
  });
  test("MAIL_FROM troca o remetente", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    await sendMail(mail, { RESEND_API_KEY: "k", MAIL_FROM: "Medicron <oi@medicron.com.br>" }, fetchMock as unknown as typeof fetch);
    expect(JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).from).toBe("Medicron <oi@medicron.com.br>");
  });
  test("a Resend recusar (ex.: 403) é erro", async () => {
    const fetchMock = vi.fn(async () => new Response('{"message":"domínio"}', { status: 403 }));
    await expect(sendMail(mail, { RESEND_API_KEY: "k" }, fetchMock as unknown as typeof fetch)).rejects.toThrow(/403/);
  });
  test("sem a chave: erro claro, sem chamar a rede", async () => {
    const fetchMock = vi.fn();
    await expect(sendMail(mail, {}, fetchMock as unknown as typeof fetch)).rejects.toThrow(/RESEND_API_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
