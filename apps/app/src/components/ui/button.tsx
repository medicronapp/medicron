import { ActivityIndicator, Pressable, type PressableProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { useColors } from "@/theme/colors";
import { Text } from "./text";

const container = cva("flex-row items-center justify-center rounded-lg border border-transparent active:opacity-80", {
  variants: {
    variant: {
      default: "bg-primary",
      outline: "border-border bg-background",
      secondary: "bg-secondary",
      ghost: "",
      destructive: "bg-destructive-soft",
      link: "",
    },
    size: { default: "h-11 gap-2 px-4", sm: "h-9 gap-1.5 px-3", lg: "h-12 gap-2 px-5", icon: "size-11" },
  },
  defaultVariants: { variant: "default", size: "default" },
});

const label = cva("font-medium", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      outline: "text-foreground",
      secondary: "text-secondary-foreground",
      ghost: "text-foreground",
      destructive: "text-destructive-ink",
      link: "text-link underline",
    },
    size: { default: "text-sm", sm: "text-sm", lg: "text-base", icon: "text-sm" },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export type ButtonProps = Omit<PressableProps, "children" | "style"> &
  VariantProps<typeof container> & { className?: string; children?: React.ReactNode; loading?: boolean };

/** Botão do site: mesmas variantes e tamanhos (h-11 por padrão, 44 px de toque). Texto simples vira o rótulo. */
export function Button({ variant, size, className, children, loading, disabled, accessibilityLabel, ...props }: ButtonProps) {
  const colors = useColors();
  const off = !!(disabled || loading);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof children === "string" ? children : undefined)}
      accessibilityState={{ disabled: off, busy: !!loading }}
      disabled={off}
      className={cn(container({ variant, size }), off && "opacity-50", className)}
      {...props}
    >
      {loading && (
        <ActivityIndicator testID="button-spinner" color={variant === "default" ? colors.primaryForeground : colors.foreground} />
      )}
      {typeof children === "string" ? <Text className={label({ variant, size })}>{children}</Text> : children}
    </Pressable>
  );
}

/** Classes do rótulo de um botão, para quem monta o conteúdo à mão (ícone + texto). */
export const buttonLabel = (variant?: ButtonProps["variant"], size?: ButtonProps["size"]) => label({ variant, size });
