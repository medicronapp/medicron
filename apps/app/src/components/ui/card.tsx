import { View, type ViewProps } from "react-native";
import { cn } from "@/lib/cn";
import { Text } from "./text";

type P = ViewProps & { className?: string };

/** Cartão do site: fundo `card`, cantos `rounded-xl` e borda fina no lugar do anel translúcido. */
export const Card = ({ className, ...p }: P) => (
  <View className={cn("gap-4 overflow-hidden rounded-xl border border-border bg-card py-4", className)} {...p} />
);
export const CardHeader = ({ className, ...p }: P) => <View className={cn("gap-1 px-4", className)} {...p} />;
export const CardContent = ({ className, ...p }: P) => <View className={cn("px-4", className)} {...p} />;
export const CardTitle = ({ className, ...p }: React.ComponentProps<typeof Text>) => (
  <Text className={cn("text-base font-medium", className)} {...p} />
);
export const CardDescription = ({ className, ...p }: React.ComponentProps<typeof Text>) => (
  <Text className={cn("text-sm text-muted-foreground", className)} {...p} />
);
