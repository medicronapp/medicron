import fs from "node:fs";
import path from "node:path";
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

describe("widgets do iOS (expo-widgets)", () => {
  const plugin = (expo.plugins as unknown[]).find((p) => Array.isArray(p) && p[0] === "expo-widgets") as [string, Record<string, any>] | undefined;
  const widgets = (plugin?.[1].widgets ?? []) as { name: string; displayName: string; ios: { supportedFamilies: string[]; initialLayout: string } }[];
  const byName = (n: string) => widgets.find((w) => w.name === n)!;

  test("três widgets na galeria: médio, Agora e Progresso, só no iOS", () => {
    expect(widgets.map((w) => w.name).sort()).toEqual(["MedicronAgoraWidget", "MedicronProgressoWidget", "MedicronWidget"]);
    expect(plugin![1].enableAndroid).toBeUndefined();
    expect(byName("MedicronWidget").displayName).toBe("Medicron");
    expect(byName("MedicronAgoraWidget").displayName).toBe("Medicron · Agora");
    expect(byName("MedicronProgressoWidget").displayName).toBe("Medicron · Progresso");
  });

  test("cada widget só declara os tamanhos para os quais foi desenhado", () => {
    expect(byName("MedicronWidget").ios.supportedFamilies).toEqual(["systemMedium"]);
    expect(byName("MedicronAgoraWidget").ios.supportedFamilies).toEqual(["accessoryRectangular", "accessoryInline"]);
    expect(byName("MedicronProgressoWidget").ios.supportedFamilies).toEqual(["accessoryRectangular"]);
  });

  test("o arquivo de layout inicial de cada widget existe", () => {
    for (const w of widgets) expect(fs.existsSync(path.join(__dirname, "..", w.ios.initialLayout.replace(/^\.\//, "")))).toBe(true);
  });
});
