import { View } from "react-native";
import { Text } from "@/components/ui/text";

export function FormHeader({ title, description }: { title: string; description: string }) {
  return (
    <View className="gap-1.5">
      <Text accessibilityRole="header" className="text-2xl font-semibold tracking-tight">{title}</Text>
      <Text className="text-sm text-muted-foreground">{description}</Text>
    </View>
  );
}
