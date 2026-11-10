// Gera o hotsite (página estática em /landing) a partir do modelo, do CSS, dos tokens do app e das fontes Geist.
// Só usa tipos apagáveis: roda direto no Node (>= 22.18) e também no Jest. Sem `import.meta`: os caminhos são argumentos.
import fs from "node:fs";
import path from "node:path";

export type SiteEnv = { contactEmail?: string; appStoreUrl?: string; playUrl?: string; origin?: string };
export type SiteSources = { template: string; css: string; themeJs: string; globalCss: string };

const DEFAULT_ORIGIN = "https://medicron.com.br";

/** Variáveis do app que a página usa (o resto do global.css não entra). */
const USED = [
  "background", "foreground", "card", "muted-foreground", "border", "primary", "primary-foreground",
  "brand-soft", "brand-ink", "destructive-soft", "destructive-ink", "success-soft", "success-ink",
];

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function blockAt(css: string, start: number): string {
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(open + 1, i);
  }
  throw new Error("bloco CSS não fechado");
}

function pick(body: string): string {
  const out: string[] = [];
  for (const m of body.matchAll(/^\s*--([\w-]+):\s*(.+?);\s*$/gm)) if (USED.includes(m[1])) out.push(`--${m[1]}:${m[2]}`);
  return out.join(";");
}

/** CSS dos tokens: claro, escuro do sistema (a menos que a pessoa tenha escolhido claro) e escuro escolhido. */
export function extractTokens(globalCss: string): string {
  const light = pick(blockAt(globalCss, globalCss.indexOf(":root {")));
  const mediaAt = globalCss.indexOf("@media (prefers-color-scheme: dark)");
  if (mediaAt < 0) throw new Error("bloco escuro não encontrado no global.css");
  const media = blockAt(globalCss, mediaAt);
  const dark = pick(blockAt(media, media.indexOf(":root")));
  return `:root{${light};--radius:.875rem}@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${dark}}}:root[data-theme="dark"]{${dark}}`;
}

function availability(env: SiteEnv): { line: string; stores: string } {
  const ios = !!env.appStoreUrl, android = !!env.playUrl;
  const line = ios && android ? "Grátis, sem anúncios. No iPhone, no Android e no navegador."
    : ios ? "Grátis, sem anúncios. No iPhone e no navegador; Android em breve."
    : android ? "Grátis, sem anúncios. No Android e no navegador; iPhone em breve."
    : "Grátis, sem anúncios. Funciona no navegador; aplicativos para iPhone e Android em breve.";
  const links = [ios ? `<a href="${escapeHtml(env.appStoreUrl!)}">App Store</a>` : "", android ? `<a href="${escapeHtml(env.playUrl!)}">Google Play</a>` : ""].filter(Boolean);
  return { line, stores: links.length ? `\n    <p class="stores">${links.join("")}</p>` : "" };
}

export function renderSite(env: SiteEnv, src: SiteSources): string {
  const { line, stores } = availability(env);
  const contact = env.contactEmail ? `<a href="mailto:${escapeHtml(env.contactEmail)}">Contato</a>` : "";
  return src.template
    .replace("{{TOKENS}}", () => extractTokens(src.globalCss))
    .replace("{{CSS}}", () => src.css.trim())
    .replace("{{THEME_JS}}", () => src.themeJs.trim())
    .replace("{{AVAILABILITY}}", () => line)
    .replace("{{STORES}}", () => stores)
    .replace("{{CONTACT}}", () => contact)
    .replaceAll("{{ORIGIN}}", () => escapeHtml(env.origin ?? DEFAULT_ORIGIN));
}

export function loadSources(appRoot: string): SiteSources {
  const read = (p: string) => fs.readFileSync(path.join(appRoot, p), "utf8");
  return { template: read("site/index.template.html"), css: read("site/site.css"), themeJs: read("site/theme.js"), globalCss: read("src/global.css") };
}

function fontsDir(appRoot: string): string {
  for (const base of [path.join(appRoot, "node_modules"), path.join(appRoot, "..", "..", "node_modules")]) {
    const dir = path.join(base, "@fontsource/geist/files");
    if (fs.existsSync(dir)) return dir;
  }
  throw new Error("@fontsource/geist não está instalado");
}

/** Escreve `landing/index.html` e as fontes em `outRoot` (padrão: `public/` do app, que o expo export copia para o site). */
export function buildSite(env: SiteEnv, appRoot: string, outRoot: string = path.join(appRoot, "public")): void {
  const landing = path.join(outRoot, "landing");
  fs.mkdirSync(path.join(landing, "fonts"), { recursive: true });
  fs.writeFileSync(path.join(landing, "index.html"), renderSite(env, loadSources(appRoot)));
  const from = fontsDir(appRoot);
  for (const w of ["400", "600"]) fs.copyFileSync(path.join(from, `geist-latin-${w}-normal.woff2`), path.join(landing, "fonts", `geist-${w}.woff2`));
}
