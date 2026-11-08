import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { BellRing, CalendarCheck, CheckCircle2, CircleAlert, Clock, SkipForward, type LucideIcon } from "lucide-react-native";
import type { DayStatusDto, EntryDto, HomeDto } from "@medicron/shared";
import { formatTime } from "@medicron/shared";
import { cn } from "@/lib/cn";
import type { ThemeColors } from "@/theme/colors";
import { EmptyState } from "@/components/empty-state";
import { ResolveButtons } from "@/components/resolve-buttons";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

const STATE: Record<EntryDto["state"], { label: string; icon: LucideIcon; box: string; text: string; ink: keyof ThemeColors }> = {
  done: { label: "Feito", icon: CheckCircle2, box: "bg-success-soft", text: "text-success-ink", ink: "successInk" },
  skipped: { label: "Pulado", icon: SkipForward, box: "bg-muted", text: "text-muted-foreground", ink: "muted" },
  missed: { label: "Sem registro", icon: CircleAlert, box: "bg-destructive-soft", text: "text-destructive-ink", ink: "destructiveInk" },
  now: { label: "Agora", icon: BellRing, box: "bg-warning-soft", text: "text-warning-ink", ink: "warningInk" },
  later: { label: "Mais tarde", icon: Clock, box: "bg-muted", text: "text-muted-foreground", ink: "muted" },
};

type Props = {
  patients: HomeDto["patients"]; selectedKey: string; todayKey: string; selectedStatus: DayStatusDto; onBackToToday: () => void;
};

export function DayTimeline({ patients, selectedKey, todayKey, selectedStatus, onBackToToday }: Props) {
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const active = patients.find((c) => c.patientId === selectedPatient) ?? patients[0];
  const past = selectedKey !== todayKey;

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-2">
        <Text accessibilityRole="header" className="text-lg font-semibold">Linha do dia</Text>
        {past ? (
          <Pressable accessibilityRole="link" accessibilityLabel="Voltar para hoje" onPress={onBackToToday} className="min-h-11 justify-center">
            <Text className="text-sm font-medium text-link underline">Voltar para hoje</Text>
          </Pressable>
        ) : null}
      </View>
      {past ? (
        <Text className="text-sm text-muted-foreground">
          <Text className="text-sm font-medium">Dia {selectedKey.slice(8)}/{selectedKey.slice(5, 7)}</Text>
          {selectedStatus === "lost" ? <> · <Text className="text-sm font-medium text-warning-ink">Dose sem solução</Text></> : null}
          {selectedStatus === "ok" ? " · Em dia" : null}
        </Text>
      ) : null}
      {!active ? (
        <EmptyState icon={CalendarCheck} title="Nenhum cuidado neste dia" description="Quando houver cuidados esperados, eles aparecem aqui." />
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" accessibilityLabel="Pacientes" contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {patients.map((c) => {
              const on = c.patientId === active.patientId;
              return (
                <Pressable
                  key={c.patientId} accessibilityRole="tab" accessibilityState={{ selected: on }}
                  onPress={() => setSelectedPatient(c.patientId)}
                  className={cn("h-11 flex-row items-center gap-2 rounded-full border px-4", on ? "border-primary bg-primary" : "border-border bg-card active:bg-muted")}
                >
                  <Text numberOfLines={1} className={cn("max-w-32 text-sm font-semibold", on ? "text-primary-foreground" : "text-foreground")}>{c.patientName}</Text>
                  <View className={cn("rounded-full px-2 py-0.5", c.missed > 0 ? "bg-destructive" : on ? "bg-primary-foreground" : "bg-brand-soft")}>
                    <Text className={cn("text-xs font-bold", c.missed > 0 ? "text-white" : on ? "text-primary" : "text-brand-ink")}>
                      {c.missed > 0 ? c.missed : `${c.resolved}/${c.total}`}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          <View className="rounded-2xl border border-border bg-card p-3">
            {active.entries.map((e, i) => {
              const s = STATE[e.state];
              return (
                <View key={`${e.planId}-${e.scheduledFor}`} className={cn("gap-2 py-3", i > 0 && "border-t border-border")}>
                  <View className="flex-row items-start gap-3">
                    <Text className="w-12 pt-0.5 text-sm font-semibold" style={{ fontVariant: ["tabular-nums"] }}>{formatTime(new Date(e.scheduledFor))}</Text>
                    <View className="min-w-0 flex-1">
                      <Text numberOfLines={1} className="font-medium">{e.itemName}</Text>
                      {e.dose || e.value ? (
                        <Text numberOfLines={1} className="text-sm text-muted-foreground">{[e.dose, e.value].filter(Boolean).join(" · ")}</Text>
                      ) : null}
                      <View className="mt-1 flex-row flex-wrap items-center gap-x-2 gap-y-1">
                        <View className={cn("flex-row items-center gap-1 rounded-full px-2 py-0.5", s.box)}>
                          <Icon icon={s.icon} color={s.ink} size={14} />
                          <Text className={cn("text-xs font-medium", s.text)}>{s.label}</Text>
                        </View>
                        {e.resolvedBy && e.resolvedAt ? (
                          <Text className="text-xs text-muted-foreground">{e.resolvedBy} · {formatTime(new Date(e.resolvedAt))}</Text>
                        ) : null}
                        {e.late ? (
                          <View className="rounded-full bg-warning-soft px-2 py-0.5">
                            <Text className="text-xs font-medium text-warning-ink">registrada depois</Text>
                          </View>
                        ) : null}
                      </View>
                      {e.note ? <Text numberOfLines={2} className="mt-1 text-xs text-muted-foreground">{`“${e.note}”`}</Text> : null}
                    </View>
                  </View>
                  {e.state === "missed" || e.state === "now" ? (
                    <ResolveButtons planId={e.planId} scheduledFor={e.scheduledFor} kind={e.kind} reschedule={e.reschedule} itemName={e.itemName} patientName={e.patientName} size="default" />
                  ) : null}
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}
