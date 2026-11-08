import { useState } from "react";
import { Pressable, View } from "react-native";
import { Check } from "lucide-react-native";
import type { OnboardingDto } from "@medicron/shared";
import { cn } from "@/lib/cn";
import { useDismissChecklist } from "@/lib/home-queries";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

type Steps = OnboardingDto["checklist"]["steps"];

const STEPS: { key: keyof Steps; label: string; href: string }[] = [
  { key: "patient", label: "Cadastrar um paciente", href: "/pacientes/novo" },
  { key: "item", label: "Cadastrar uma medicação ou procedimento", href: "/itens/novo" },
  { key: "plan", label: "Montar a rotina", href: "/pacientes" },
  { key: "push", label: "Ativar os avisos no celular", href: "/conta" },
];

/** Checklist de primeiros passos: marcado pelo uso real; Dispensar (ou Concluir, com tudo feito) esconde para sempre. */
export function FirstStepsCard({ steps, onNavigate }: { steps: Steps; onNavigate: (href: string) => void }) {
  const [hidden, setHidden] = useState(false);
  const dismiss = useDismissChecklist();
  if (hidden) return null;
  const done = STEPS.filter((s) => steps[s.key]).length;
  const all = done === STEPS.length;

  function close() {
    setHidden(true);
    dismiss.mutate();
  }

  return (
    <View accessibilityLabel="Primeiros passos" className="gap-3 rounded-2xl border border-brand-20 bg-brand-soft p-4">
      <View className="flex-row items-center justify-between gap-3">
        <Text accessibilityRole="header" className="text-base font-semibold text-brand-ink">Primeiros passos</Text>
        <Text className="text-sm font-medium text-brand-ink" style={{ fontVariant: ["tabular-nums"] }}>{done}/{STEPS.length}</Text>
      </View>
      <View
        accessible accessibilityRole="progressbar" accessibilityLabel="Progresso" accessibilityValue={{ min: 0, max: STEPS.length, now: done }}
        className="h-1.5 overflow-hidden rounded-full bg-brand-20"
      >
        <View className="h-full rounded-full bg-brand" style={{ width: `${(done / STEPS.length) * 100}%` }} />
      </View>
      <View className="gap-1">
        {STEPS.map((s) => {
          const ok = steps[s.key];
          const mark = ok ? (
            <View className="size-5 items-center justify-center rounded-full bg-success">
              <Icon icon={Check} color="successForeground" size={12} />
            </View>
          ) : (
            <View className="size-5 rounded-full border-2 border-brand-40" />
          );
          return ok ? (
            <View key={s.key} className="min-h-9 flex-row items-center gap-2.5">
              {mark}
              <Text className="flex-1 text-sm text-brand-ink/70 line-through">{s.label}</Text>
            </View>
          ) : (
            <Pressable
              key={s.key} accessibilityRole="link" accessibilityLabel={s.label} onPress={() => onNavigate(s.href)}
              className={cn("min-h-11 flex-row items-center gap-2.5 rounded-lg")}
            >
              {mark}
              <Text className="flex-1 text-sm font-medium text-brand-ink">{s.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View className="items-end">
        {all ? (
          <Button size="sm" onPress={close}>Concluir</Button>
        ) : (
          <Button size="sm" variant="ghost" onPress={close}>Dispensar</Button>
        )}
      </View>
    </View>
  );
}
