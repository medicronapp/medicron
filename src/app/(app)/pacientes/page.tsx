import { HeartPulse } from "lucide-react";
import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { listPatients } from "@/lib/services/patients";
import { AddLink } from "@/components/add-link";
import { PatientCard } from "@/components/patient-card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export default async function Page() {
  const { orgId } = await getOrgContext();
  const patients = await listPatients(getDb(), orgId);
  const add = <AddLink href="/pacientes/novo" label="Novo gato" />;
  return (
    <div className="grid gap-5">
      <PageHeader title="Gatos" description={patients.length ? `${patients.length} ${patients.length === 1 ? "gato" : "gatos"} nesta conta` : undefined} actions={add} />
      {patients.length === 0 ? (
        <EmptyState icon={HeartPulse} title="Nenhum gato cadastrado" description="Cadastre o primeiro para montar a rotina de cuidados." action={add} />
      ) : (
        <ul className="grid gap-3">
          {patients.map((c) => <li key={c.id}><PatientCard patient={c} /></li>)}
        </ul>
      )}
    </div>
  );
}
