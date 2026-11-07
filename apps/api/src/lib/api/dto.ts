import type { ItemDto, PatientDto, PlanDto } from "@medicron/shared";
import type { CarePlan, Item, Patient } from "@/lib/db/schema";

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

/** Com `item` junto (listagem por paciente) o DTO inclui o item. */
export function toPlanDto(p: CarePlan & { item?: Item }): PlanDto {
  return {
    id: p.id, patientId: p.patientId, itemId: p.itemId, ...(p.item ? { item: toItemDto(p.item) } : {}),
    dose: p.dose, intervalMinutes: p.intervalMinutes, anchorAt: iso(p.anchorAt),
    endAt: p.endAt ? iso(p.endAt) : null, active: p.active, reschedule: p.reschedule,
    nextDueAt: iso(p.nextDueAt), createdAt: iso(p.createdAt),
  };
}
