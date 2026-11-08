import { View } from "react-native";
import { Pill, Stethoscope } from "lucide-react-native";
import { cn } from "@/lib/cn";
import { ResolveButtons } from "@/components/resolve-buttons";
import { StatusBadge } from "@/components/status-badge";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export type DoseCardProps = {
  planId: string; scheduledFor: string; patientName: string; itemName: string; dose: string | null;
  kind: "medication" | "procedure"; reschedule: boolean; timeLabel: string; relative: string; tone: "overdue" | "now" | "upcoming";
};

const STRIPE: Record<DoseCardProps["tone"], string> = { overdue: "bg-destructive", now: "bg-warning", upcoming: "bg-info" };

/** Cartão de uma dose pendente: faixa lateral por tom, quem/o quê/quando e, se já é hora, Feito e Pular. */
export function DoseCard(p: DoseCardProps) {
  return (
    <View className="gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 pl-5">
      <View className={cn("absolute inset-y-0 left-0 w-1.5", STRIPE[p.tone])} />
      <View className="flex-row items-start gap-3">
        <View className="size-10 items-center justify-center rounded-full bg-brand-soft">
          <Icon icon={p.kind === "procedure" ? Stethoscope : Pill} color="brandInk" size={20} />
        </View>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-base font-semibold">{p.patientName}</Text>
          <Text numberOfLines={2} className="text-sm text-muted-foreground">{p.itemName}{p.dose ? ` · ${p.dose}` : ""}</Text>
        </View>
        <View className="items-end">
          <Text className="text-lg font-semibold leading-none" style={{ fontVariant: ["tabular-nums"] }}>{p.timeLabel}</Text>
          <Text className="mt-1 text-xs text-muted-foreground">{p.relative}</Text>
        </View>
      </View>
      <StatusBadge tone={p.tone} />
      {p.tone !== "upcoming" ? (
        <ResolveButtons planId={p.planId} scheduledFor={p.scheduledFor} kind={p.kind} reschedule={p.reschedule} itemName={p.itemName} patientName={p.patientName} />
      ) : null}
    </View>
  );
}
