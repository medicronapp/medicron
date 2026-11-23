import type { Mail } from "@/lib/email/send";

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** E-mail de "esqueci minha senha": o link vale 1 hora e a pessoa pode ignorar se não pediu. */
export function resetPasswordEmail({ name, link }: { name: string; link: string }): Pick<Mail, "subject" | "html" | "text"> {
  const subject = "Criar uma nova senha no Medicron";
  const text = [
    `Olá, ${name}.`,
    "",
    "Recebemos um pedido para criar uma nova senha da sua conta no Medicron. Abra o link abaixo para escolher a nova senha. Ele vale por 1 hora e só pode ser usado uma vez:",
    "",
    link,
    "",
    "Se não foi você, ignore este e-mail: a sua senha continua a mesma.",
    "",
    "Medicron",
  ].join("\n");
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#fbfaf7;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#1c2b2d">
<div style="max-width:480px;margin:0 auto;padding:32px 24px">
<p style="font-size:18px;font-weight:600;margin:0 0 24px">Medicron</p>
<p style="font-size:16px;line-height:1.6;margin:0 0 12px">Olá, ${escapeHtml(name)}.</p>
<p style="font-size:16px;line-height:1.6;margin:0 0 24px">Recebemos um pedido para criar uma nova senha da sua conta. O link vale por 1 hora e só pode ser usado uma vez.</p>
<p style="margin:0 0 24px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#00706a;color:#fff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 22px;border-radius:11px">Criar nova senha</a></p>
<p style="font-size:14px;line-height:1.6;color:#5b6b6d;margin:0 0 8px">Se o botão não abrir, copie este endereço no navegador:</p>
<p style="font-size:13px;line-height:1.5;color:#5b6b6d;word-break:break-all;margin:0 0 24px">${escapeHtml(link)}</p>
<p style="font-size:14px;line-height:1.6;color:#5b6b6d;margin:0">Se não foi você, ignore este e-mail: a sua senha continua a mesma.</p>
</div></body></html>`;
  return { subject, html, text };
}
