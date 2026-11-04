export function orgSlug(name: string): string {
  const base = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "conta";
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}
