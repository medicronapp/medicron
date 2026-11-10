import fs from "node:fs";
import path from "node:path";

const doc = fs.readFileSync(path.resolve(__dirname, "../../../docs/app-store-connect.md"), "utf8");

/** Campos do tipo "### Nome do campo (até N)" seguidos de um bloco de código com o texto a colar. */
const fields = [...doc.matchAll(/### ([^\n]*?)\(até (\d+)\)[^\n]*\n(?:(?!###)[\s\S])*?```\n([\s\S]*?)\n```/g)].map((m) => ({ name: m[1].trim(), limit: Number(m[2]), text: m[3] }));

describe("docs/app-store-connect.md: textos para colar no painel da Apple", () => {
  test("tem todos os campos com limite que o painel pede", () => {
    expect(fields.map((f) => [f.name, f.limit])).toEqual([
      ["Nome", 30],
      ["Subtítulo", 30],
      ["Texto promocional", 170],
      ["Descrição", 4000],
      ["Palavras-chave", 100],
      ["Novidades desta versão", 4000],
      ["Notas para o revisor", 4000],
    ]);
  });

  test("cada texto respeita o limite de caracteres do campo", () => {
    for (const f of fields) expect([...f.text].length).toBeLessThanOrEqual(f.limit);
  });

  test("nome e subtítulo não estão vazios nem repetem um ao outro", () => {
    const [nome, sub] = fields;
    expect(nome.text.trim().length).toBeGreaterThan(0);
    expect(sub.text.trim().length).toBeGreaterThan(0);
    expect(sub.text).not.toContain(nome.text);
  });

  test("palavras-chave: separadas por vírgula, sem espaços e sem repetir o nome nem o subtítulo", () => {
    const kw = fields.find((f) => f.name === "Palavras-chave")!.text;
    expect(kw).not.toMatch(/\s/);
    const words = kw.split(",");
    expect(new Set(words).size).toBe(words.length);
    const name = fields[0].text.toLowerCase();
    const sub = fields[1].text.toLowerCase().split(/\s+/);
    for (const w of words) { expect(w.toLowerCase()).not.toBe(name); expect(sub).not.toContain(w.toLowerCase()); }
  });

  test("metadados da loja não citam outras plataformas, nem promessa médica (diretrizes 2.3.10 e 1.4.1)", () => {
    for (const f of fields.filter((x) => x.name !== "Notas para o revisor")) {
      expect(f.text).not.toMatch(/android|google|play store|samsung/i);
      // o aviso legal ("não faz diagnóstico nem indica doses ou tratamentos") é a única frase que pode citar essas palavras
      const claims = f.text.replace(/não faz diagnóstico nem indica doses ou tratamentos/g, "");
      expect(claims).not.toMatch(/\b(cura|curar|trata|tratamos|tratamento|diagnóstic[ao]|diagnostic[ao]|garant)/i);
    }
    expect(fields.find((f) => f.name === "Descrição")!.text).toMatch(/não faz diagnóstico nem indica doses ou tratamentos/);
  });

  test("a descrição não usa a palavra proibida do projeto ('bicho')", () => {
    expect(doc.toLowerCase()).not.toContain("bicho");
  });

  test("as notas do revisor estão em inglês e citam a exclusão de conta e a conta de demonstração", () => {
    const n = fields.find((f) => f.name === "Notas para o revisor")!.text;
    expect(n).toMatch(/demo account/i);
    expect(n).toMatch(/account deletion/i);
    expect(n).toMatch(/does NOT diagnose/);
  });

  test("o rótulo de exclusão citado ao revisor existe no app", () => {
    const comp = fs.readFileSync(path.resolve(__dirname, "../src/components/delete-account.tsx"), "utf8");
    expect(comp).toContain("Excluir minha conta");
    const notif = fs.readFileSync(path.resolve(__dirname, "../src/components/enable-notifications.tsx"), "utf8");
    expect(notif).toContain('accessibilityLabel="Ativar notificações"');
  });
});
