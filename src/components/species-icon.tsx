import { Cat, Dog, PawPrint, User } from "lucide-react";
import type { Species } from "@/lib/species";

/** Ícone do tipo de paciente (decorativo: o rótulo vem sempre em texto ao lado). */
export function SpeciesIcon({ species, className }: { species: Species; className?: string }) {
  switch (species) {
    case "cat": return <Cat aria-hidden className={className} />;
    case "dog": return <Dog aria-hidden className={className} />;
    case "human": return <User aria-hidden className={className} />;
    default: return <PawPrint aria-hidden className={className} />;
  }
}
