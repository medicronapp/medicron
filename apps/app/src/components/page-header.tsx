import { View } from "react-native";
import { Text } from "@/components/ui/text";

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <View className="gap-1">
      <Text accessibilityRole="header" className="text-2xl font-semibold tracking-tight">{title}</Text>
      {description ? <Text className="text-sm text-muted-foreground">{description}</Text> : null}
    </View>
  );
}
