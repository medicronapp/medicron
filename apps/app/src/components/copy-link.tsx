import { View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Copy } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";

/** Copia para a área de transferência e avisa. */
export async function copyToClipboard(text: string) {
  await Clipboard.setStringAsync(text);
  toast.success("Link copiado");
}

/** Convite criado: o link para enviar à pessoa, com o botão de copiar. */
export function CopyLink({ link }: { link: string }) {
  return (
    <View className="gap-2 rounded-xl bg-brand-soft p-3">
      <Text className="text-sm font-medium text-brand-ink">Convite criado. Envie este link para a pessoa:</Text>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Input readOnly selectTextOnFocus value={link} accessibilityLabel="Link do convite" className="bg-background" />
        </View>
        <Button variant="secondary" size="icon" accessibilityLabel="Copiar link do convite" onPress={() => void copyToClipboard(link)}>
          <Icon icon={Copy} color="foreground" size={16} />
        </Button>
      </View>
    </View>
  );
}
