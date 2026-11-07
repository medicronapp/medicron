import { View, type ViewProps } from "react-native";
import { cn } from "@/lib/cn";

/** Esqueleto de carregamento (pulsa). */
export const Skeleton = ({ className, ...p }: ViewProps & { className?: string }) => (
  <View className={cn("animate-pulse rounded-md bg-muted", className)} {...p} />
);
