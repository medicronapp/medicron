import { readFileSync } from "node:fs";
import path from "node:path";

/** Lê largura, altura e tipo de cor (2 = RGB sem alfa, 6 = RGBA) do cabeçalho do PNG. */
function png(name: string) {
  const b = readFileSync(path.resolve(__dirname, "../assets", name));
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25] };
}

describe("ícones gerados do logo Ciclo", () => {
  test("ícone do app: 1024 quadrado e sem canal alfa (exigência da App Store)", () => {
    expect(png("icon.png")).toMatchObject({ w: 1024, h: 1024, colorType: 2 });
  });
  test("primeiro plano do ícone adaptativo do Android: 1024 com transparência", () => {
    expect(png("adaptive-icon-foreground.png")).toMatchObject({ w: 1024, h: 1024, colorType: 6 });
  });
  test("tela de abertura, favicon e ícone de notificação", () => {
    expect(png("splash-icon.png")).toMatchObject({ w: 1024, h: 1024 });
    expect(png("favicon.png")).toMatchObject({ w: 48, h: 48 });
    expect(png("notification-icon.png")).toMatchObject({ w: 96, h: 96, colorType: 6 });
  });
});
