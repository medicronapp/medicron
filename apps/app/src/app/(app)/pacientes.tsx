import { HeartPulse } from "lucide-react-native";
import { EmptyState } from "@/components/empty-state";
import { Screen } from "@/components/screen";

export default function Pacientes() {
  return (
    <Screen>
      <EmptyState icon={HeartPulse} title="Em construção" description="Os pacientes chegam em breve." />
    </Screen>
  );
}
