import type { VercelConfig } from "@vercel/config/v1";

// Sem crons da Vercel: o plano Hobby só permite execução diária.
// Os lembretes são disparados por um agendador externo (cron-job.org) chamando
// GET /api/cron/dispatch a cada minuto com o header "Authorization: Bearer <CRON_SECRET>".
// O redirecionamento para medicron.com.br só vale quando DOMAIN_REDIRECT=1 (variável de ambiente da Vercel,
// lida na build). Assim o deploy não manda ninguém para um domínio que ainda pode não estar no ar;
// a variável é ligada depois que o DNS propagar e o domínio responder.
const domainRedirect = process.env.DOMAIN_REDIRECT === "1";

export const config: VercelConfig = {
  framework: "nextjs",
  redirects: domainRedirect
    ? [
        // Só o host exato antigo redireciona (previews seguem funcionando).
        // Temporário (307): o navegador não guarda para sempre e dá para desfazer se o domínio novo falhar.
        // /api, /privacidade e /.well-known ficam de fora: depois da virada da web o site estático em medicron.com.br
        // reescreve essas rotas para este host (medicron.vercel.app); redirecioná-las de volta seria um laço, e o
        // agendador dos lembretes perderia o Authorization.
        {
          source: "/:path((?!api/|privacidade|\\.well-known/).*)",
          has: [{ type: "host", value: "medicron.vercel.app" }],
          destination: "https://medicron.com.br/:path",
          permanent: false,
        },
      ]
    : [],
};
