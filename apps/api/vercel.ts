import type { VercelConfig } from "@vercel/config/v1";

// Sem crons da Vercel: o plano Hobby só permite execução diária.
// Os lembretes são disparados por um agendador externo (cron-job.org) chamando
// GET /api/cron/dispatch a cada minuto com o header "Authorization: Bearer <CRON_SECRET>".
export const config: VercelConfig = {
  framework: "nextjs",
  redirects: [
    // O domínio de produção é medicron.com.br; só o host exato antigo redireciona (previews seguem funcionando).
    {
      source: "/:path*",
      has: [{ type: "host", value: "medicron.vercel.app" }],
      destination: "https://medicron.com.br/:path*",
      permanent: true,
    },
  ],
};
