import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Patient } from "@/lib/db/schema";
import { ageLabel, patientTone } from "@/lib/format";
import { speciesLabel } from "@/lib/species";
import { SpeciesIcon } from "@/components/species-icon";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const TONES = [
  "bg-brand-soft text-brand-ink",
  "bg-info-soft text-info-ink",
  "bg-success-soft text-success-ink",
  "bg-warning-soft text-warning-ink",
  "bg-destructive-soft text-destructive-ink",
  "bg-secondary text-secondary-foreground",
];

export function PatientCard({ patient }: { patient: Patient }) {
  const meta = [
    speciesLabel(patient.species),
    patient.birthDate ? ageLabel(patient.birthDate, new Date()) : null,
    patient.weightKg ? `${String(Number(patient.weightKg)).replace(".", ",")} kg` : null,
  ].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/pacientes/${patient.id}`}
      className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 shadow-xs transition-colors hover:bg-muted/50"
    >
      <Avatar size="lg" className="size-12">
        <AvatarFallback className={TONES[patientTone(patient.name)]}><SpeciesIcon species={patient.species} className="size-5" /></AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold">{patient.name}</p>
        {meta && <p className="truncate text-sm text-muted-foreground">{meta}</p>}
      </div>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}
