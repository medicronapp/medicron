// Configuração do projeto estático da web (o vercel.json é gerado por `npm run vercel-config`).
// O navegador só vê medicron.com.br: a API, a política de privacidade e os arquivos de links universais
// são reescritos para o projeto da API (host próprio), e qualquer outro caminho sem extensão cai no app.
export type Rewrite = { source: string; destination: string };

export function buildVercelConfig(apiOrigin: string) {
  const toApi = (source: string, path = source): Rewrite => ({ source, destination: `${apiOrigin}${path}` });
  return {
    buildCommand: "npx expo export -p web",
    outputDirectory: "dist",
    installCommand: "cd ../.. && npm ci",
    cleanUrls: false,
    redirects: [
      // O app se chamava "gatos": atalhos do PWA e links salvos continuam funcionando.
      { source: "/gatos", destination: "/pacientes", permanent: true },
      { source: "/gatos/:path*", destination: "/pacientes/:path*", permanent: true },
    ],
    rewrites: [
      toApi("/api/:path*"),
      toApi("/privacidade"),
      toApi("/.well-known/:path*"),
      // Arquivos reais já são servidos antes das reescritas; a regra só impede que um arquivo inexistente (`/x.js`)
      // devolva o HTML do app. Consequência: um caminho do app com ponto (`/convite/a.b`) dá 404; os ids atuais não têm ponto.
      { source: "/((?!.*\\.[a-zA-Z0-9]+$).*)", destination: "/index.html" },
    ] as Rewrite[],
    headers: [
      // O projeto novo guarda na CDN as respostas das reescritas externas que permitirem cache. A API é por usuário:
      // nada dela pode ser compartilhado entre contas, mesmo que uma rota ganhe `s-maxage` no futuro.
      { source: "/api/:path*", headers: [{ key: "x-vercel-enable-rewrite-caching", value: "0" }] },
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
