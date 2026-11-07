const FORMAT = /^\d+(\.\d+){0,2}$/;

function parse(v: string): [number, number, number] {
  if (!FORMAT.test(v)) throw new Error(`Versão inválida: "${v}"`);
  const [major = 0, minor = 0, patch = 0] = v.split(".").map(Number);
  return [major, minor, patch];
}

/** Compara versões `N`, `N.N` ou `N.N.N` numericamente: -1 se a < b, 0 se iguais, 1 se a > b. */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = parse(a), pb = parse(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  }
  return 0;
}
