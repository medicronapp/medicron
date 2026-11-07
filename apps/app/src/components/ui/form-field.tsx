import { Children, cloneElement, isValidElement } from "react";
import { View } from "react-native";
import { Text } from "./text";

type Props = { label: string; hint?: string; error?: string; children: React.ReactNode };

/** Rótulo + campo + dica/erro (o erro é um alerta). Liga o rótulo e o estado inválido ao campo. */
export function FormField({ label, hint, error, children }: Props) {
  const control = Children.map(children, (child) =>
    isValidElement<{ accessibilityLabel?: string; invalid?: boolean }>(child)
      ? cloneElement(child, { accessibilityLabel: child.props.accessibilityLabel ?? label, invalid: child.props.invalid ?? !!error })
      : child,
  );
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium">{label}</Text>
      {control}
      {hint ? <Text className="text-xs text-muted-foreground">{hint}</Text> : null}
      {error ? (
        <Text accessibilityRole="alert" className="text-xs font-medium text-destructive">{error}</Text>
      ) : null}
    </View>
  );
}
