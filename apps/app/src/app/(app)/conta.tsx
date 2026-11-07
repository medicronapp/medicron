import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { fetchMe } from "@/lib/api/me";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";

export default function Conta() {
  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe(apiClient) });
  return (
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
  );
}
