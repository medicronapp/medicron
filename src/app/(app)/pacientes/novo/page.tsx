import { PatientForm } from "@/components/patient-form";
import { PageHeader } from "@/components/page-header";
import { createPatientAction } from "../actions";

export default function Page() {
  return (
    <div className="grid gap-5">
      <PageHeader title="Novo gato" backHref="/pacientes" />
      <PatientForm action={createPatientAction} />
    </div>
  );
}
