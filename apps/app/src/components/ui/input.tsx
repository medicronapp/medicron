import { TextInput, type TextInputProps } from "react-native";
import { cn } from "@/lib/cn";
import { useColors } from "@/theme/colors";
import { fontFamilyFor } from "@/theme/fonts";

type Props = TextInputProps & { className?: string; invalid?: boolean };

/** Campo de texto do site: h-11, borda `input`, borda vermelha quando inválido. */
export const Input = ({ className, invalid, editable = true, style, ...props }: Props) => {
  const colors = useColors();
  return (
    <TextInput
      aria-invalid={invalid ? true : undefined}
      editable={editable}
      placeholderTextColor={colors.muted}
      className={cn(
        "h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base text-foreground",
        invalid && "border-destructive",
        !editable && "opacity-50",
        className,
      )}
      style={[{ fontFamily: fontFamilyFor("") }, style]}
      {...props}
    />
  );
};
