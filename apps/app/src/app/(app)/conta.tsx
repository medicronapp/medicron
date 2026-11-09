import { View } from "react-native";
import { useMe } from "@/lib/me-query";
import { Screen } from "@/components/screen";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";

export default function Conta() {
  const me = useMe();
  return (
    <Screen>
    <View className="gap-4">
      <Text accessibilityRole="header" className="text-2xl font-semibold tracking-tight">Conta</Text>
      <Card className="gap-1 p-4">
        {me.data ? (
          <>
            <Text className="font-medium">{me.data.user.name}</Text>
            <Text className="text-sm text-muted-foreground">{me.data.user.email}</Text>
          </>
        ) : (
          <Skeleton className="h-10 w-48 rounded-lg" />
        )}
      </Card>
    </View>
    </Screen>
  );
}
