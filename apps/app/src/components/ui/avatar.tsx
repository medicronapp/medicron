import { View } from "react-native";
import { cn } from "@/lib/cn";
import { Text } from "./text";

const SIZES = { sm: "size-6", default: "size-8", lg: "size-10" } as const;

type Props = { fallback: string; size?: keyof typeof SIZES; className?: string; textClassName?: string };

/** Avatar com a inicial (o site só usa o fallback; sem foto). */
export function Avatar({ fallback, size = "default", className, textClassName }: Props) {
  return (
    <View className={cn("items-center justify-center rounded-full bg-muted", SIZES[size], className)}>
      <Text className={cn("text-sm text-muted-foreground", size === "sm" && "text-xs", textClassName)}>{fallback}</Text>
    </View>
  );
}
