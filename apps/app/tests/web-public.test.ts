import fs from "node:fs";
import path from "node:path";

const pub = path.join(__dirname, "..", "public");

test("manifest.webmanifest é válido e os ícones existem", () => {
  const m = JSON.parse(fs.readFileSync(path.join(pub, "manifest.webmanifest"), "utf8"));
  expect(m.start_url).toBe("/");
  expect(m.display).toBe("standalone");
  expect(m.icons).toHaveLength(3);
  for (const i of m.icons) expect(fs.existsSync(path.join(pub, i.src))).toBe(true);
});

test("sw.js trata push e clique na notificação", () => {
  const sw = fs.readFileSync(path.join(pub, "sw.js"), "utf8");
  expect(sw).toContain('addEventListener("push"');
  expect(sw).toContain('addEventListener("notificationclick"');
});

test("o HTML da web (modelo do Expo em single) liga o manifest, o ícone da tela de início e a cor do tema", () => {
  const html = fs.readFileSync(path.join(pub, "index.html"), "utf8");
  expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
  expect(html).toContain('rel="apple-touch-icon" href="/icons/apple-touch-icon.png"');
  expect(html).toContain('name="theme-color" content="#0d9488"');
  expect(html).toContain('lang="pt-BR"');
  expect(html).toContain("%WEB_TITLE%");
  expect(html).toContain('http-equiv="X-UA-Compatible"');
  expect(html).not.toContain("httpEquiv");
  expect(html).toContain('<div id="root">');
});

test("o HTML aplica o tema guardado antes da primeira pintura (script síncrono no head, com try/catch)", () => {
  const html = fs.readFileSync(path.join(pub, "index.html"), "utf8");
  const head = html.slice(html.indexOf("<head>"), html.indexOf("</head>"));
  expect(head).toContain('localStorage.getItem("medicron.theme")');
  expect(head).toContain('setAttribute("data-theme"');
  expect(head).toMatch(/try\s*{[\s\S]*}\s*catch/);
  expect(head.indexOf("<script>")).toBeLessThan(head.indexOf('<style id="expo-reset"'));
});
