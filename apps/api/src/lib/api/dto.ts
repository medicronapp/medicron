import type { PatientDto } from "@medicron/shared";
import type { Patient } from "@/lib/db/schema";

const iso = (d: Date) => d.toISOString();

export function toPatientDto(p: Patient): PatientDto {
  return {
    id: p.id, name: p.name, species: p.species, birthDate: p.birthDate, weightKg: p.weightKg,
    notes: p.notes, createdAt: iso(p.createdAt),
  };
}
