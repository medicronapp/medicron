import { View } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { Text } from "./text";

const container = cva("h-5 flex-row items-center justify-center gap-1 self-start rounded-full border border-transparent px-2", {
  variants: {
    variant: {
      default: "bg-primary",
      secondary: "bg-secondary",
      destructive: "bg-destructive-soft",
      outline: "border-border",
      ghost: "",
    },
  },
  defaultVariants: { variant: "default" },
});
const label = cva("text-xs font-medium", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      secondary: "text-secondary-foreground",
      destructive: "text-destructive-ink",
      outline: "text-foreground",
      ghost: "text-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

type Props = VariantProps<typeof container> & { className?: string; children: React.ReactNode };

/** Selo do site (ex.: "A cada 8 horas"). */
export function Badge({ variant, className, children }: Props) {
  return (
    <View className={cn(container({ variant }), className)}>
      {typeof children === "string" ? <Text className={label({ variant })}>{children}</Text> : children}
    </View>
  );
}
