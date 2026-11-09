import { describe, expect, test } from "vitest";
import { appleAppSiteAssociation, assetLinks } from "@/lib/app-links";
import { GET as aasa } from "@/app/.well-known/apple-app-site-association/route";
import { GET as assetlinks } from "@/app/.well-known/assetlinks.json/route";

describe("appleAppSiteAssociation", () => {
  test("monta o appID com o Team ID e o caminho do convite", () => {
    expect(appleAppSiteAssociation({ APPLE_TEAM_ID: "ABCDE12345" })).toEqual({
      applinks: { details: [{ appIDs: ["ABCDE12345.app.medicron"], components: [{ "/": "/convite/*" }] }] },
    });
  });
  test("sem Team ID (ou em branco) é null, nunca um JSON incompleto", () => {
    expect(appleAppSiteAssociation({})).toBeNull();
    expect(appleAppSiteAssociation({ APPLE_TEAM_ID: "   " })).toBeNull();
  });
});

describe("assetLinks", () => {
  test("lista os fingerprints separados por vírgula, sem espaços e sem vazios", () => {
    expect(assetLinks({ ANDROID_SHA256_CERT_FINGERPRINTS: " AA:BB , CC:DD ,, " })).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: { namespace: "android_app", package_name: "app.medicron", sha256_cert_fingerprints: ["AA:BB", "CC:DD"] },
      },
    ]);
  });
  test("sem fingerprint é null", () => {
    expect(assetLinks({})).toBeNull();
    expect(assetLinks({ ANDROID_SHA256_CERT_FINGERPRINTS: " , " })).toBeNull();
  });
});

describe("rotas públicas de links universais", () => {
  const withEnv = async (vars: Record<string, string | undefined>, fn: () => Promise<void>) => {
    const old = { ...process.env };
    Object.assign(process.env, vars);
    for (const [k, v] of Object.entries(vars)) if (v === undefined) delete process.env[k];
    try { await fn(); } finally { process.env = old; }
  };

  test("apple-app-site-association: 200, application/json, sem redirecionar", async () => {
    await withEnv({ APPLE_TEAM_ID: "ABCDE12345" }, async () => {
      const res = await aasa();
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect(res.headers.get("location")).toBeNull();
      expect((await res.json()).applinks.details[0].appIDs).toEqual(["ABCDE12345.app.medicron"]);
    });
  });
  test("apple-app-site-association sem configuração: 404", async () => {
    await withEnv({ APPLE_TEAM_ID: undefined }, async () => {
      expect((await aasa()).status).toBe(404);
    });
  });
  test("assetlinks.json: 200, application/json e o fingerprint; sem configuração: 404", async () => {
    await withEnv({ ANDROID_SHA256_CERT_FINGERPRINTS: "AA:BB" }, async () => {
      const res = await assetlinks();
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect((await res.json())[0].target.sha256_cert_fingerprints).toEqual(["AA:BB"]);
    });
    await withEnv({ ANDROID_SHA256_CERT_FINGERPRINTS: undefined }, async () => {
      expect((await assetlinks()).status).toBe(404);
    });
  });
});
