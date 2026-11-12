import { Linking, View } from "react-native";
import { useRouter } from "expo-router";
import { manageUrl } from "@/lib/purchases";
import { useSubscription } from "@/lib/subscription-queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

export const formatDay = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

/** Cartão do plano na tela Conta: o plano, o uso dos limites e o botão certo (conhecer o Plus ou gerenciar a assinatura). */
export function PlusCard() {
  const router = useRouter();
  const { subscription: sub } = useSubscription();
  if (!sub) return null; // ainda carregando: nada de piscar "grátis"
  const plus = sub.tier === "plus";
  const members = `${sub.usage.members} de ${sub.limits.members} pessoas na conta`;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Medicron Plus</CardTitle>
      </CardHeader>
      <CardContent className="gap-3">
        {plus ? (
          <View className="gap-1">
            {sub.willRenew ? (
              <>
                <Text className="text-sm font-medium">{`Ativo até ${formatDay(sub.plusUntil!)}`}</Text>
                <Text className="text-sm text-muted-foreground">Renova automaticamente</Text>
              </>
            ) : (
              <Text className="text-sm font-medium">{`Não renova: termina em ${formatDay(sub.plusUntil!)}`}</Text>
            )}
            {sub.source === "manual" ? <Text className="text-sm text-muted-foreground">Concedido pela equipe do Medicron</Text> : null}
            <Text className="text-sm text-muted-foreground">Pacientes ilimitados</Text>
            <Text className="text-sm text-muted-foreground">{members}</Text>
          </View>
        ) : (
          <View className="gap-1">
            <Text className="text-sm font-medium">Plano grátis</Text>
            <Text className="text-sm text-muted-foreground">{`${sub.usage.patients} de ${sub.limits.patients} pacientes`}</Text>
            <Text className="text-sm text-muted-foreground">{members}</Text>
          </View>
        )}
        {plus ? (
          sub.source === "manual" ? null : (
            <Button variant="outline" size="lg" accessibilityLabel="Gerenciar assinatura" onPress={() => { void Linking.openURL(manageUrl()); }}>Gerenciar assinatura</Button>
          )
        ) : (
          <Button size="lg" accessibilityLabel="Conhecer o Plus" onPress={() => router.push("/plus" as never)}>Conhecer o Plus</Button>
        )}
      </CardContent>
    </Card>
  );
}
