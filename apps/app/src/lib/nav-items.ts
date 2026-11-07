import { HeartPulse, Home, Pill, Users, type LucideIcon } from "lucide-react-native";

export const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Hoje", icon: Home },
  { href: "/pacientes", label: "Pacientes", icon: HeartPulse },
  { href: "/itens", label: "Itens", icon: Pill },
  { href: "/conta", label: "Conta", icon: Users },
];

/** "/" só casa exato; os demais casam por segmento ("/pacientes/x" ativa "/pacientes", "/pacientesx" não). */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
