"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { createPatient, updatePatient, archivePatient, type PatientInput } from "@/lib/services/patients";

function parse(f: FormData): PatientInput {
  const weight = String(f.get("weightKg") ?? "").replace(",", ".").trim();
  return {
    name: String(f.get("name") ?? ""),
    birthDate: String(f.get("birthDate") ?? "") || undefined,
    weightKg: weight ? Number(weight) : undefined,
    notes: String(f.get("notes") ?? "") || undefined,
  };
}

export async function createPatientAction(f: FormData) {
  const { orgId } = await getOrgContext();
  const patient = await createPatient(getDb(), orgId, parse(f));
  revalidatePath("/pacientes");
  redirect(`/pacientes/${patient.id}`);
}

export async function updatePatientAction(id: string, f: FormData) {
  const { orgId } = await getOrgContext();
  await updatePatient(getDb(), orgId, id, parse(f));
  revalidatePath("/pacientes");
  redirect(`/pacientes/${id}?aba=dados`);
}

export async function archivePatientAction(id: string) {
  const { orgId } = await getOrgContext();
  await archivePatient(getDb(), orgId, id);
  revalidatePath("/", "layout");
  redirect("/pacientes");
}
