// Configuração do projeto estático da web (o vercel.json é gerado por `npm run vercel-config`).
// O navegador só vê medicron.com.br: a API, a política de privacidade, os termos de uso e os arquivos de links universais
// são reescritos para o projeto da API (host próprio), e qualquer outro caminho sem extensão cai no app.
// A raiz `/` decide pelo cookie de sessão: com sessão (ou PWA instalado) é o app; sem sessão, o hotsite (/landing).
export type Rewrite = { source: string; destination: string; has?: { type: "cookie" | "query"; key: string; value?: string }[] };

/** Cookie de sessão do better-auth em produção (https): a página não o lê (HttpOnly), quem decide é o roteador. O teste da
 *  API (`session-cookie.test.ts`) garante que este nome é o que o better-auth realmente gera. */
export const SESSION_COOKIE = "__Secure-better-auth.session_token";

export function buildVercelConfig(apiOrigin: string) {
  const toApi = (source: string, path = source): Rewrite => ({ source, destination: `${apiOrigin}${path}` });
  return {
    // Hotsite e arquivos públicos primeiro; depois o app; por fim o index.html do app vira app.html (arquivo estático tem
    // precedência sobre reescritas, então a raiz só pode ser decidida pela Vercel se não houver index.html).
    buildCommand: "node scripts/build-site.cli.ts && npx expo export -p web && node scripts/finalize-web.cli.ts",
    outputDirectory: "dist",
    installCommand: "cd ../.. && npm ci",
    cleanUrls: false,
    redirects: [
      // O app se chamava "gatos": atalhos do PWA e links salvos continuam funcionando.
      { source: "/gatos", destination: "/pacientes", permanent: true },
      { source: "/gatos/:path*", destination: "/pacientes/:path*", permanent: true },
      // O app agora é app.html e o hotsite só existe na raiz.
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/landing", destination: "/", permanent: true },
      { source: "/landing/", destination: "/", permanent: true },
    ],
    rewrites: [
      toApi("/api/:path*"),
      toApi("/privacidade"),
      toApi("/termos"),
      toApi("/.well-known/:path*"),
      // A raiz: PWA instalado (start_url com ?source=pwa) e quem tem sessão vão ao app; o resto vê o hotsite.
      { source: "/", has: [{ type: "query", key: "source", value: "pwa" }], destination: "/app.html" },
      { source: "/", has: [{ type: "cookie", key: SESSION_COOKIE }], destination: "/app.html" },
      { source: "/", destination: "/landing/index.html" },
      // Arquivos reais já são servidos antes das reescritas; a regra só impede que um arquivo inexistente (`/x.js`)
      // devolva o HTML do app. Consequência: um caminho do app com ponto (`/convite/a.b`) dá 404; os ids atuais não têm ponto.
      { source: "/((?!.*\\.[a-zA-Z0-9]+$).*)", destination: "/app.html" },
    ] as Rewrite[],
    headers: [
      // O projeto novo guarda na CDN as respostas das reescritas externas que permitirem cache. A API é por usuário:
      // nada dela pode ser compartilhado entre contas, mesmo que uma rota ganhe `s-maxage` no futuro.
      { source: "/api/:path*", headers: [{ key: "x-vercel-enable-rewrite-caching", value: "0" }] },
      { source: "/landing/fonts/:file", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ],
  };
}
