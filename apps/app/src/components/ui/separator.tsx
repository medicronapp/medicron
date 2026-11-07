import { View } from "react-native";
import { cn } from "@/lib/cn";

type Props = { orientation?: "horizontal" | "vertical"; className?: string };

export const Separator = ({ orientation = "horizontal", className }: Props) => (
  <View
    accessibilityRole="none"
    className={cn("shrink-0 bg-border", orientation === "horizontal" ? "h-px w-full" : "w-px self-stretch", className)}
  />
);
