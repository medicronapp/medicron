import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  // A cada minuto exige plano Pro; no Hobby, use um agendador externo chamando a mesma URL.
  crons: [{ path: "/api/cron/dispatch", schedule: "* * * * *" }],
};
