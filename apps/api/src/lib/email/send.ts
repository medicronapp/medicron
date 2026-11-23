// Envio de e-mail pela Resend (API HTTP; sem dependência extra). A chave é restrita a "enviar" e fica só no servidor.
export type Mail = { to: string; subject: string; html: string; text: string };

type Env = Record<string, string | undefined>;

const DEFAULT_FROM = "Medicron <nao-responda@medicron.com.br>";

export async function sendMail(mail: Mail, env: Env = process.env, fetchImpl: typeof fetch = fetch): Promise<void> {
  const key = env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("RESEND_API_KEY não está definida");
  const res = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env.MAIL_FROM?.trim() || DEFAULT_FROM, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text }),
  });
  if (!res.ok) throw new Error(`Resend recusou o envio (${res.status}): ${(await res.text()).slice(0, 200)}`);
}
