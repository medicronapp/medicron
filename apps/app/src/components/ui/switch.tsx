import { Switch as RNSwitch, View } from "react-native";
import { useColors } from "@/theme/colors";

type Props = { value: boolean; onValueChange: (v: boolean) => void; accessibilityLabel: string; disabled?: boolean };

/** Interruptor do site (`Switch`): alvo de 44 px, ligado na cor primária. */
export function Switch({ value, onValueChange, accessibilityLabel, disabled }: Props) {
  const colors = useColors();
  return (
    <View className="min-h-11 justify-center">
      <RNSwitch
        accessibilityRole="switch" accessibilityLabel={accessibilityLabel} accessibilityState={{ checked: value, disabled }}
        value={value} onValueChange={onValueChange} disabled={disabled} trackColor={{ true: colors.primary }}
      />
    </View>
  );
}
