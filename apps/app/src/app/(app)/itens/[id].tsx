import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { PackageX } from "lucide-react-native";
import type { ItemBody } from "@medicron/shared";
import { ApiClientError, errorMessage } from "@/lib/api/errors";
import { useArchiveItem, useItem, useUpdateItem } from "@/lib/item-queries";
import { ConfirmSheet } from "@/components/confirm-sheet";
import { EmptyState } from "@/components/empty-state";
import { ErrorView } from "@/components/error-view";
import { ItemForm } from "@/components/item-form";
import { PageHeader } from "@/components/page-header";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

export default function Item() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = String(params.id);
  const query = useItem(id);
  const update = useUpdateItem();
  const archive = useArchiveItem();
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);

  if (query.isPending) {
    return (
      <Screen>
        <View accessibilityLabel="Carregando" aria-busy className="gap-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </View>
      </Screen>
    );
  }
  if (query.isError || !query.data) {
    const notFound = query.error instanceof ApiClientError && query.error.status === 404;
    return (
      <Screen>
        {notFound ? (
          <EmptyState
            icon={PackageX} title="Item não encontrado" description="Ele pode ter sido arquivado."
            action={<Button size="lg" onPress={() => router.navigate("/itens")} accessibilityLabel="Ver itens">Ver itens</Button>}
          />
        ) : (
          <ErrorView onRetry={() => void query.refetch()} />
        )}
      </Screen>
    );
  }

  const item = query.data;
  const toList = (kind: string) => router.navigate(`/itens?tipo=${kind}` as never);

  async function save(body: ItemBody) {
    setSaving(true);
    try {
      const saved = await update.mutateAsync({ id, body });
      toast.success("Salvo");
      toList(saved.kind);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <PageHeader title={item.name} onBack={() => toList(item.kind)} />
      <ItemForm item={item} onSubmit={save} submitting={saving} />
      <Button variant="destructive" size="lg" onPress={() => setArchiving(true)} accessibilityLabel="Arquivar item">Arquivar item</Button>
      <ConfirmSheet
        open={archiving} onOpenChange={setArchiving}
        title={`Arquivar ${item.name}?`}
        description="O item some das listas e as rotinas que o usam são encerradas."
        confirmLabel="Arquivar"
        onConfirm={async () => { await archive.mutateAsync(id); toList(item.kind); }}
      />
    </Screen>
  );
}
