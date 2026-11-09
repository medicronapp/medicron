import appJson from "../app.json";
import eas from "../eas.json";

const expo = appJson.expo as Record<string, any>;

describe("app.json para as lojas", () => {
  test("identidade e orientação", () => {
    expect(expo.version).toBe("1.0.0");
    expect(expo.orientation).toBe("portrait");
    expect(expo.ios.bundleIdentifier).toBe("app.medicron");
    expect(expo.android.package).toBe("app.medicron");
    expect(expo.ios.supportsTablet).toBe(false);
  });
  test("iOS: build number, domínio associado e declaração de criptografia", () => {
    expect(expo.ios.buildNumber).toBe("1");
    expect(expo.ios.associatedDomains).toEqual(["applinks:medicron.com.br"]);
    expect(expo.ios.infoPlist.ITSAppUsesNonExemptEncryption).toBe(false);
  });
  test("Android: versionCode e App Links verificados para /convite", () => {
    expect(expo.android.versionCode).toBe(1);
    const f = expo.android.intentFilters[0];
    expect(f.autoVerify).toBe(true);
    expect(f.action).toBe("VIEW");
    expect(f.data).toEqual([{ scheme: "https", host: "medicron.com.br", pathPrefix: "/convite" }]);
    expect(f.category).toEqual(["BROWSABLE", "DEFAULT"]);
  });
});

describe("eas.json", () => {
  test("perfis apontam para a API de produção, sem segredos", () => {
    for (const p of ["development", "preview", "production"]) {
      expect(eas.build[p as keyof typeof eas.build].env.EXPO_PUBLIC_API_URL).toBe("https://medicron.com.br");
    }
    expect(JSON.stringify(eas)).not.toMatch(/secret|password|token/i);
  });
  test("produção incrementa o número de build sozinha e o número de build fica no EAS (o app.json não é reescrito a cada build)", () => {
    expect(eas.build.production.autoIncrement).toBe(true);
    expect(eas.cli.appVersionSource).toBe("remote");
  });
  test("preview gera APK/instalável interno", () => {
    expect(eas.build.preview.distribution).toBe("internal");
  });
});
