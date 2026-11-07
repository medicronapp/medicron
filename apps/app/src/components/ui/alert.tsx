import { createContext, useContext } from "react";
import { View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";
import { Text } from "./text";

type Variant = "default" | "destructive";
const VariantContext = createContext<Variant>("default");

type AlertProps = { variant?: Variant; icon?: LucideIcon; className?: string; children: React.ReactNode };

/** Aviso do site: cartão com borda; o destrutivo usa a cor de erro no texto e no ícone. */
export function Alert({ variant = "default", icon, className, children }: AlertProps) {
  return (
    <VariantContext.Provider value={variant}>
      <View accessible accessibilityRole="alert" className={cn("w-full flex-row items-start gap-2 rounded-lg border border-border bg-card px-2.5 py-2", className)}>
        {icon ? (
          <View className="pt-0.5">
            <Icon icon={icon} color={variant === "destructive" ? "destructive" : "foreground"} size={16} />
          </View>
        ) : null}
        <View className="flex-1 gap-0.5">{children}</View>
      </View>
    </VariantContext.Provider>
  );
}

export function AlertDescription({ className, ...props }: React.ComponentProps<typeof Text>) {
  const variant = useContext(VariantContext);
  return <Text className={cn("text-sm", variant === "destructive" ? "text-destructive" : "text-muted-foreground", className)} {...props} />;
}
