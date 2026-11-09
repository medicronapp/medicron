// Arquivos que ligam o domínio ao app nativo (links universais no iOS, App Links no Android).
// Os valores vêm do ambiente: o Team ID e as impressões digitais só existem depois do cadastro nas lojas.
const BUNDLE_ID = "app.medicron";

type Env = Record<string, string | undefined>;

export function appleAppSiteAssociation(env: Env) {
  const teamId = env.APPLE_TEAM_ID?.trim();
  if (!teamId) return null;
  return {
    applinks: {
      details: [{ appIDs: [`${teamId}.${BUNDLE_ID}`], components: [{ "/": "/convite/*" }] }],
    },
  };
}

export function assetLinks(env: Env) {
  const fingerprints = (env.ANDROID_SHA256_CERT_FINGERPRINTS ?? "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);
  if (fingerprints.length === 0) return null;
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: { namespace: "android_app", package_name: BUNDLE_ID, sha256_cert_fingerprints: fingerprints },
    },
  ];
}

export function jsonOrNotFound(body: unknown) {
  if (body === null) return new Response("Not found", { status: 404 });
  return Response.json(body, { headers: { "cache-control": "public, max-age=3600" } });
}
