/** Iniciais (até 2 letras maiúsculas) de um nome; "?" se vazio. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const letters = parts.length === 1 ? parts[0][0] : parts[0][0] + parts[1][0];
  return letters.toUpperCase();
}
