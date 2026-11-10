// Depois do `expo export`: o index.html do app vira app.html. A Vercel serve arquivo estático antes de aplicar reescritas,
// então a raiz `/` só pode ser decidida (hotsite ou app, por cookie) se não existir um index.html na raiz.
import fs from "node:fs";
import path from "node:path";

export function finalizeWeb(distDir: string): void {
  const index = path.join(distDir, "index.html");
  const app = path.join(distDir, "app.html");
  if (!fs.existsSync(index)) throw new Error(`index.html não encontrado em ${distDir} (a exportação do app falhou?)`);
  if (fs.existsSync(app)) throw new Error(`app.html já existe em ${distDir}: não sobrescrevo em silêncio`);
  if (!fs.existsSync(path.join(distDir, "landing", "index.html"))) {
    throw new Error(`landing/index.html não encontrado em ${distDir}: sem o hotsite, a raiz ficaria sem página para quem não está logado`);
  }
  fs.renameSync(index, app);
}
