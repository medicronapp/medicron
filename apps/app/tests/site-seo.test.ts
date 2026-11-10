import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildSite, loadSources, renderSite } from "../scripts/build-site";

const appRoot = path.resolve(__dirname, "..");
const src = loadSources(appRoot);
const html = renderSite({}, src);
const meta = (attr: string, name: string) => html.match(new RegExp(`<meta ${attr}="${name}"[^>]*content="([^"]*)"`))?.[1];

describe("metas básicas", () => {
  test("idioma, título (≤ 60) e descrição (≤ 160), sem promessa médica", () => {
    expect(html).toContain('<html lang="pt-BR">');
    const title = html.match(/<title>([^<]*)<\/title>/)![1];
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title).toContain("Medicron");
    const desc = meta("name", "description")!;
    expect(desc.length).toBeLessThanOrEqual(160);
    expect(desc.length).toBeGreaterThan(60);
    expect(`${title} ${desc}`).not.toMatch(/trat(a|amento)|cura|diagn[óo]stic|dose certa/i);
  });
  test("canonical aponta para a raiz do domínio (e respeita a origem configurada)", () => {
    expect(html).toContain('<link rel="canonical" href="https://medicron.com.br/">');
    expect(renderSite({ origin: "https://exemplo.dev" }, src)).toContain('<link rel="canonical" href="https://exemplo.dev/">');
  });
  test("theme-color claro e escuro por media", () => {
    expect(html).toMatch(/<meta name="theme-color" content="#[0-9a-f]{6}" media="\(prefers-color-scheme: light\)">/);
    expect(html).toMatch(/<meta name="theme-color" content="#[0-9a-f]{6}" media="\(prefers-color-scheme: dark\)">/);
  });
});

describe("compartilhamento (Open Graph e Twitter)", () => {
  test("tags e imagem absoluta", () => {
    expect(meta("property", "og:type")).toBe("website");
    expect(meta("property", "og:locale")).toBe("pt_BR");
    expect(meta("property", "og:url")).toBe("https://medicron.com.br/");
    expect(meta("property", "og:title")).toBeTruthy();
    expect(meta("property", "og:description")).toBe(meta("name", "description"));
    expect(meta("property", "og:image")).toBe("https://medicron.com.br/landing/og.png");
    expect(meta("property", "og:image:width")).toBe("1200");
    expect(meta("property", "og:image:height")).toBe("630");
    expect(meta("property", "og:image:alt")).toBeTruthy();
    expect(meta("name", "twitter:card")).toBe("summary_large_image");
  });
});

describe("dados estruturados", () => {
  const raw = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1];
  const data = JSON.parse(raw);
  test("SoftwareApplication gratuito, sem avaliação inventada", () => {
    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@type"]).toBe("SoftwareApplication");
    expect(data.name).toBe("Medicron");
    expect(data.applicationCategory).toBe("HealthApplication");
    expect(data.operatingSystem).toBe("Web");
    expect(data.offers).toMatchObject({ "@type": "Offer", price: "0", priceCurrency: "BRL" });
    expect(data.aggregateRating).toBeUndefined();
    expect(data.review).toBeUndefined();
  });
  test("o JSON não pode fechar o script (nada de '<' cru)", () => {
    expect(raw).not.toContain("<");
  });
});

describe("arquivos publicados", () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "site-seo-"));
  buildSite({}, appRoot, out);
  test("robots.txt libera o hotsite, esconde as rotas privadas do app e aponta o sitemap", () => {
    const r = fs.readFileSync(path.join(out, "robots.txt"), "utf8");
    expect(r).toContain("User-agent: *");
    expect(r).toContain("Allow: /");
    for (const p of ["/api/", "/pacientes", "/itens", "/conta", "/convite/"]) expect(r).toContain(`Disallow: ${p}`);
    expect(r).toContain("Sitemap: https://medicron.com.br/sitemap.xml");
  });
  test("sitemap.xml lista a raiz e a política de privacidade", () => {
    const s = fs.readFileSync(path.join(out, "sitemap.xml"), "utf8");
    expect(s).toContain("<loc>https://medicron.com.br/</loc>");
    expect(s).toContain("<loc>https://medicron.com.br/privacidade</loc>");
  });
  test("a imagem de compartilhamento é um PNG 1200×630", () => {
    for (const file of [path.join(appRoot, "site/og.png"), path.join(out, "landing/og.png")]) {
      const b = fs.readFileSync(file);
      expect(b.subarray(1, 4).toString()).toBe("PNG");
      expect(b.readUInt32BE(16)).toBe(1200);
      expect(b.readUInt32BE(20)).toBe(630);
      expect(b.length).toBeLessThanOrEqual(150 * 1024);
    }
  });
});
