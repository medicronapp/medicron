import { Plus } from "lucide-react-native";
import { Button, buttonLabel } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

/** Botão de "novo/adicionar" do cabeçalho de Pacientes e Itens. */
export function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Button onPress={onPress} accessibilityLabel={label}>
      <Icon icon={Plus} color="primaryForeground" size={16} />
      <Text className={buttonLabel("default", "default")}>{label}</Text>
    </Button>
  );
}
