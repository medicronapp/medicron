import { Text as RNText, type TextProps } from "react-native";
import { cn } from "@/lib/cn";
import { fontFamilyFor } from "@/theme/fonts";

type Props = TextProps & { className?: string };

/** Texto do app: cor e tamanho padrão do site e a Geist no peso da classe (o peso do nativo vem da família). */
export function Text({ className, style, ...props }: Props) {
  const merged = cn("text-base text-foreground", className);
  return <RNText className={merged} style={[{ fontFamily: fontFamilyFor(merged) }, style]} {...props} />;
}
