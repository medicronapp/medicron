/** Iniciais (até 2 letras maiúsculas) de um nome; "?" se vazio. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const letters = parts.length === 1 ? parts[0][0] : parts[0][0] + parts[1][0];
  return letters.toUpperCase();
}

/** Idade a partir de "YYYY-MM-DD": "menos de 1 mês", "6 meses", "1 ano", "5 anos". */
export function ageLabel(birthDate: string, now: Date): string {
  const [y, m, d] = birthDate.split("-").map(Number);
  let months = (now.getUTCFullYear() - y) * 12 + (now.getUTCMonth() + 1 - m);
  if (now.getUTCDate() < d) months -= 1;
  if (months < 1) return "menos de 1 mês";
  if (months < 12) return `${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? "ano" : "anos"}`;
}

/** Índice estável (0–5) para escolher a cor do avatar de um paciente pelo nome. */
export function patientTone(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 6;
}
