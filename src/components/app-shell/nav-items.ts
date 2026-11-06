import { HeartPulse, Home, Pill, Users, type LucideIcon } from "lucide-react";

export const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Hoje", icon: Home },
  { href: "/pacientes", label: "Gatos", icon: HeartPulse },
  { href: "/itens", label: "Itens", icon: Pill },
  { href: "/conta", label: "Conta", icon: Users },
];

/** "/" só casa exato; os demais casam por segmento ("/pacientes/x" ativa "/pacientes", "/gatosx" não). */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
