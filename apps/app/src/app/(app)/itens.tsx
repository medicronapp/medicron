import { Pill } from "lucide-react-native";
import { EmptyState } from "@/components/empty-state";
import { Screen } from "@/components/screen";

export default function Itens() {
  return (
    <Screen>
      <EmptyState icon={Pill} title="Em construção" description="Os itens chegam em breve." />
    </Screen>
  );
}
