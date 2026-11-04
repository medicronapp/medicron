import { Cat, Home, Pill, Users, type LucideIcon } from "lucide-react";

export const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Hoje", icon: Home },
  { href: "/gatos", label: "Gatos", icon: Cat },
  { href: "/itens", label: "Itens", icon: Pill },
  { href: "/conta", label: "Conta", icon: Users },
];

/** "/" só casa exato; os demais casam por segmento ("/gatos/x" ativa "/gatos", "/gatosx" não). */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
