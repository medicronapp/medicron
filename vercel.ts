import type { VercelConfig } from "@vercel/config/v1";

// Sem crons da Vercel: o plano Hobby só permite execução diária.
// Os lembretes são disparados por um agendador externo (cron-job.org) chamando
// GET /api/cron/dispatch a cada minuto com o header "Authorization: Bearer <CRON_SECRET>".
export const config: VercelConfig = {
  framework: "nextjs",
};
