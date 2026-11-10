import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { buildStoreIcons, STORE_ICONS } from "../scripts/store-icons";

const appIcon = path.resolve(__dirname, "../assets/icon.png");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "medicron-icons-"));

describe("ícones das lojas", () => {
  test("o roteiro: App Store 1024×1024 sem transparência e Google Play 512×512 em 32 bits", () => {
    expect(STORE_ICONS).toEqual([
      { file: "ios-1024.png", size: 1024, alpha: false },
      { file: "android-512.png", size: 512, alpha: true },
    ]);
  });

  test("gera os dois arquivos a partir do ícone do app, nos tamanhos exatos", async () => {
    const out = tmp();
    const made = await buildStoreIcons(appIcon, out);
    expect(made.map((m) => [m.file, m.width, m.height])).toEqual([["ios-1024.png", 1024, 1024], ["android-512.png", 512, 512]]);
    for (const m of made) expect(fs.existsSync(path.join(out, m.file))).toBe(true);
  });

  test("App Store: PNG sem canal alfa (a Apple rejeita transparência) e sem cantos arredondados (o iOS aplica a máscara)", async () => {
    const out = tmp();
    await buildStoreIcons(appIcon, out);
    const meta = await sharp(path.join(out, "ios-1024.png")).metadata();
    expect(meta.format).toBe("png");
    expect(meta.hasAlpha).toBe(false);
    const { data, info } = await sharp(path.join(out, "ios-1024.png")).raw().toBuffer({ resolveWithObject: true });
    const corner = [data[0], data[1], data[2]];
    expect(corner.some((v) => v > 0)).toBe(true); // o canto tem cor (não é preto de máscara nem transparência)
    expect(info.channels).toBe(3);
  });

  test("Google Play: PNG de 32 bits (com canal alfa), todo opaco e quadrado até as pontas (o Google aplica a máscara), até 1 MB", async () => {
    const out = tmp();
    await buildStoreIcons(appIcon, out);
    const file = path.join(out, "android-512.png");
    expect((await sharp(file).metadata()).hasAlpha).toBe(true);
    expect(fs.statSync(file).size).toBeLessThanOrEqual(1024 * 1024);
    const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
    expect(info.channels).toBe(4);
    for (const [x, y] of [[0, 0], [511, 0], [0, 511], [511, 511], [256, 256]]) expect(data[(y * 512 + x) * 4 + 3]).toBe(255);
  });

  test("o menor é a mesma imagem reduzida (mesma cor central)", async () => {
    const out = tmp();
    await buildStoreIcons(appIcon, out);
    const a = await sharp(path.join(out, "ios-1024.png")).extract({ left: 500, top: 700, width: 24, height: 24 }).stats();
    const b = await sharp(path.join(out, "android-512.png")).removeAlpha().extract({ left: 250, top: 350, width: 12, height: 12 }).stats();
    for (let c = 0; c < 3; c++) expect(Math.abs(a.channels[c].mean - b.channels[c].mean)).toBeLessThan(6);
  });

  test("recusa origem que não seja quadrada ou tenha menos de 1024 px (evita ampliar e borrar)", async () => {
    const dir = tmp();
    const small = path.join(dir, "small.png");
    await sharp({ create: { width: 512, height: 512, channels: 3, background: "#0f766e" } }).png().toFile(small);
    await expect(buildStoreIcons(small, path.join(dir, "o"))).rejects.toThrow(/1024/);
    const wide = path.join(dir, "wide.png");
    await sharp({ create: { width: 1200, height: 1024, channels: 3, background: "#0f766e" } }).png().toFile(wide);
    await expect(buildStoreIcons(wide, path.join(dir, "o"))).rejects.toThrow(/quadrad/);
  });
});
