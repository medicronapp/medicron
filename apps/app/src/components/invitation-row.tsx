import { useState } from "react";
import { View } from "react-native";
import { Copy, Mail } from "lucide-react-native";
import { inviteLink } from "@medicron/shared";
import { API_URL } from "@/lib/api-url";
import { cancelInvitation } from "@/lib/org";
import { copyToClipboard } from "@/components/copy-link";
import { ConfirmSheet } from "@/components/confirm-sheet";
import { Badge } from "@/components/ui/badge";
import { Button, buttonLabel } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";

/** Um convite pendente: copiar o link ou cancelar (com confirmação). */
export function InvitationRow({ id, email }: { id: string; email: string }) {
  const [cancelling, setCancelling] = useState(false);
  return (
    <View className="gap-2 py-3">
      <View className="flex-row items-center gap-2">
        <Icon icon={Mail} color="muted" size={16} />
        <Text numberOfLines={1} className="min-w-0 flex-1 text-sm">{email}</Text>
        <Badge variant="outline">Pendente</Badge>
      </View>
      <View className="flex-row gap-2">
        <Button variant="secondary" className="flex-1" accessibilityLabel="Copiar link" onPress={() => void copyToClipboard(inviteLink(id, API_URL))}>
          <Icon icon={Copy} color="foreground" size={16} />
          <Text className={buttonLabel("secondary", "default")}>Copiar link</Text>
        </Button>
        <Button variant="outline" className="flex-1" onPress={() => setCancelling(true)}>Cancelar</Button>
      </View>
      <ConfirmSheet
        open={cancelling} onOpenChange={setCancelling}
        title="Cancelar convite?" description={`O link enviado para ${email} deixará de funcionar.`} confirmLabel="Cancelar convite"
        onConfirm={async () => { await cancelInvitation(id); toast.success("Convite cancelado"); }}
      />
    </View>
  );
}
