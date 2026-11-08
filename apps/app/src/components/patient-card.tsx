import { Pressable, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import type { PatientDto } from "@medicron/shared";
import { ageLabel, patientTone, speciesLabel } from "@medicron/shared";
import { now } from "@/lib/clock";
import type { ThemeColors } from "@/theme/colors";
import { SpeciesIcon } from "@/components/species-icon";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

const TONES: { box: string; ink: keyof ThemeColors }[] = [
  { box: "bg-brand-soft", ink: "brandInk" },
  { box: "bg-info-soft", ink: "infoInk" },
  { box: "bg-success-soft", ink: "successInk" },
  { box: "bg-warning-soft", ink: "warningInk" },
  { box: "bg-destructive-soft", ink: "destructiveInk" },
  { box: "bg-secondary", ink: "foreground" },
];

/** "4.20" → "4,2 kg". */
export const weightLabel = (kg: string) => `${String(Number(kg)).replace(".", ",")} kg`;

export function PatientCard({ patient, onPress }: { patient: PatientDto; onPress: () => void }) {
  const meta = [
    speciesLabel(patient.species),
    patient.birthDate ? ageLabel(patient.birthDate, now()) : null,
    patient.weightKg ? weightLabel(patient.weightKg) : null,
  ].filter(Boolean).join(" · ");
  const tone = TONES[patientTone(patient.name)];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${patient.name}, ${meta}`} onPress={onPress} className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3.5 active:bg-muted">
      <View className={`size-12 items-center justify-center rounded-full ${tone.box}`}>
        <SpeciesIcon species={patient.species} color={tone.ink} />
      </View>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-base font-semibold">{patient.name}</Text>
        {meta ? <Text numberOfLines={1} className="text-sm text-muted-foreground">{meta}</Text> : null}
      </View>
      <Icon icon={ChevronRight} color="muted" size={20} />
    </Pressable>
  );
}
