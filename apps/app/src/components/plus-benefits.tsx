import { View } from "react-native";
import { Infinity as InfinityIcon, History, Users } from "lucide-react-native";
import { PLUS_LIMITS } from "@medicron/shared";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

const BENEFITS = [
  { icon: InfinityIcon, text: "Pacientes ilimitados" },
  { icon: Users, text: `Até ${PLUS_LIMITS.members} pessoas na conta` },
  { icon: History, text: "Histórico completo" },
] as const;

/** O que o Plus libera, em cartões com ícone. Os textos são os mesmos das fichas das lojas. */
export function PlusBenefits({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <View className="gap-1 rounded-2xl border border-border bg-card px-3.5 py-2.5">
        {BENEFITS.map(({ icon, text }) => (
          <View key={text} className="min-h-9 flex-row items-center gap-3">
            <Icon icon={icon} color="brandInk" size={18} />
            <Text className="flex-1 text-base font-medium">{text}</Text>
          </View>
        ))}
      </View>
    );
  }
  return (
    <View className="gap-2">
      {BENEFITS.map(({ icon, text }) => (
        <View key={text} className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-3.5 py-3">
          <View className="size-9 items-center justify-center rounded-xl bg-brand-soft">
            <Icon icon={icon} color="brandInk" size={18} />
          </View>
          <Text className="flex-1 text-base font-medium">{text}</Text>
        </View>
      ))}
    </View>
  );
}
