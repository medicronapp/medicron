import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ItemBody } from "@medicron/shared";
import { errorMessage } from "@/lib/api/errors";
import { kindFromParam } from "@/lib/item-kind";
import { useCreateItem } from "@/lib/item-queries";
import { ItemForm } from "@/components/item-form";
import { PageHeader } from "@/components/page-header";
import { Screen } from "@/components/screen";
import { toast } from "@/components/ui/toast";

export default function NovoItem() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tipo?: string }>();
  const kind = kindFromParam(params.tipo);
  const create = useCreateItem();
  const [submitting, setSubmitting] = useState(false);

  async function submit(body: ItemBody) {
    setSubmitting(true);
    try {
      const item = await create.mutateAsync(body);
      toast.success("Salvo");
      router.dismissTo(`/itens?tipo=${item.kind}` as never);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <PageHeader title="Novo item" onBack={() => router.dismissTo(`/itens?tipo=${kind}` as never)} />
      <ItemForm defaultKind={kind} onSubmit={submit} submitting={submitting} />
    </Screen>
  );
}
