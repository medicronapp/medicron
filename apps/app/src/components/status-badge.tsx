import { View } from "react-native";
import { AlertCircle, BellRing, CheckCircle2, Clock, SkipForward, type LucideIcon } from "lucide-react-native";
import { cn } from "@/lib/cn";
import type { ThemeColors } from "@/theme/colors";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export type Tone = "overdue" | "now" | "upcoming" | "done" | "skipped";

const TONES: Record<Tone, { label: string; icon: LucideIcon; box: string; text: string; ink: keyof ThemeColors }> = {
  overdue: { label: "Atrasada", icon: AlertCircle, box: "bg-destructive-soft", text: "text-destructive-ink", ink: "destructiveInk" },
  now: { label: "Agora", icon: BellRing, box: "bg-warning-soft", text: "text-warning-ink", ink: "warningInk" },
  upcoming: { label: "Próxima", icon: Clock, box: "bg-info-soft", text: "text-info-ink", ink: "infoInk" },
  done: { label: "Feito", icon: CheckCircle2, box: "bg-success-soft", text: "text-success-ink", ink: "successInk" },
  skipped: { label: "Pulado", icon: SkipForward, box: "bg-muted", text: "text-muted-foreground", ink: "muted" },
};

/** Sempre ícone + texto: o status nunca depende só da cor. */
export function StatusBadge({ tone, className }: { tone: Tone; className?: string }) {
  const t = TONES[tone];
  return (
    <View className={cn("flex-row items-center gap-1 self-start rounded-full px-2 py-0.5", t.box, className)}>
      <Icon icon={t.icon} color={t.ink} size={14} />
      <Text className={cn("text-xs font-medium", t.text)}>{t.label}</Text>
    </View>
  );
}
