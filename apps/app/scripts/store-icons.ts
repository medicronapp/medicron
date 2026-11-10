// Ícones para as fichas das lojas, gerados a partir do ícone do app (assets/icon.png, 1024×1024 quadrado e opaco).
//  - App Store: 1024×1024, PNG SEM transparência (a Apple rejeita canal alfa) e sem cantos arredondados (o iOS aplica a máscara).
//  - Google Play: 512×512, PNG de 32 bits (com canal alfa, aqui todo opaco), até 1 MB, também quadrado (o Google aplica a máscara).
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

export const STORE_ICONS = [
  { file: "ios-1024.png", size: 1024, alpha: false },
  { file: "android-512.png", size: 512, alpha: true },
];

export type MadeIcon = { file: string; width: number; height: number; bytes: number };

/** Gera os ícones das lojas em `outDir`. Recusa uma origem que não seja quadrada ou tenha menos de 1024 px (ampliar borra). */
export async function buildStoreIcons(srcPath: string, outDir: string): Promise<MadeIcon[]> {
  const meta = await sharp(srcPath).metadata();
  if (!meta.width || !meta.height || meta.width !== meta.height) throw new Error(`o ícone de origem precisa ser quadrado (veio ${meta.width}×${meta.height})`);
  if (meta.width < 1024) throw new Error(`o ícone de origem precisa ter pelo menos 1024 px (veio ${meta.width})`);
  fs.mkdirSync(outDir, { recursive: true });
  const made: MadeIcon[] = [];
  for (const { file, size, alpha } of STORE_ICONS) {
    // achata sobre a cor da marca (garante opacidade) e reduz com Lanczos; no iOS remove o canal alfa, no Google o mantém (32 bits)
    let img = sharp(srcPath).flatten({ background: "#0f766e" }).resize(size, size, { fit: "cover", kernel: "lanczos3" });
    img = alpha ? img.ensureAlpha() : img.removeAlpha();
    const out = path.join(outDir, file);
    const info = await img.png({ compressionLevel: 9 }).toFile(out);
    made.push({ file, width: info.width, height: info.height, bytes: info.size });
  }
  return made;
}
