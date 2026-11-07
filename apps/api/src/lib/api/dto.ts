import type { ItemDto, PatientDto } from "@medicron/shared";
import type { Item, Patient } from "@/lib/db/schema";

const iso = (d: Date) => d.toISOString();

export function toPatientDto(p: Patient): PatientDto {
  return {
    id: p.id, name: p.name, species: p.species, birthDate: p.birthDate, weightKg: p.weightKg,
    notes: p.notes, createdAt: iso(p.createdAt),
  };
}

export function toItemDto(i: Item): ItemDto {
  return { id: i.id, name: i.name, kind: i.kind, defaultDose: i.defaultDose, notes: i.notes, createdAt: iso(i.createdAt) };
}
