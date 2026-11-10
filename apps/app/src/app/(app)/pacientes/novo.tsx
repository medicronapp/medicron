import { useState } from "react";
import { useRouter } from "expo-router";
import type { PatientBody } from "@medicron/shared";
import { errorMessage } from "@/lib/api/errors";
import { isPlanLimit } from "@/lib/plan-limit";
import { useCreatePatient } from "@/lib/patient-queries";
import { PageHeader } from "@/components/page-header";
import { PatientForm } from "@/components/patient-form";
import { Screen } from "@/components/screen";
import { toast } from "@/components/ui/toast";

export default function NovoPaciente() {
  const router = useRouter();
  const create = useCreatePatient();
  const [submitting, setSubmitting] = useState(false);

  async function submit(body: PatientBody) {
    setSubmitting(true);
    try {
      const patient = await create.mutateAsync(body);
      toast.success("Salvo");
      router.replace(`/pacientes/${patient.id}` as never);
    } catch (err) {
      const limit = isPlanLimit(err);
      if (limit) router.replace(`/plus?motivo=${limit.limit}` as never);
      else toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <PageHeader title="Novo paciente" onBack={() => router.dismissTo("/pacientes")} />
      <PatientForm onSubmit={submit} submitting={submitting} />
    </Screen>
  );
}
