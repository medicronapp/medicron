import { HeartPulse } from "lucide-react-native";
import { EmptyState } from "@/components/empty-state";

export default function Pacientes() {
  return <EmptyState icon={HeartPulse} title="Em construção" description="Os pacientes chegam em breve." />;
}
