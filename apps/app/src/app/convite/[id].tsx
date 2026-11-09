import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MailX, TriangleAlert, UsersRound } from "lucide-react-native";
import { acceptInvitation, getInvitation } from "@/lib/org";
import { useAppSession } from "@/lib/session";
import { BrandMark } from "@/components/brand-mark";
import { ErrorView } from "@/components/error-view";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";

const ACCEPT_ERROR = "Não foi possível aceitar o convite (talvez você já seja membro ou o convite seja de outro e-mail).";

/** Cartão central do convite (igual ao do site). Abre por `medicron://convite/<id>` e pelo caminho `/convite/<id>`. */
export default function Convite() {
  const router = useRouter();
  const insets = useSafeAreaInsets(); // fora da casca do app: o topo precisa respeitar a barra de status
  const { id } = useLocalSearchParams<{ id: string }>();
  const invitationId = String(id);
  const session = useAppSession();
  const [accepted, setAccepted] = useState(false);
  // Depois de aceitar a consulta não roda mais: o servidor passa a dizer que o convite "não existe" (já foi usado).
  const invitation = useQuery({ queryKey: ["invitation", invitationId], queryFn: () => getInvitation(invitationId), retry: false, enabled: !accepted });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const accepting = useRef(false); // dois toques seguidos aceitam uma vez só

  // Só entra na Hoje quando a lista de contas já tem a conta nova: com a lista ainda velha (0 contas) a guarda
  // mandaria o convidado para "Nova conta".
  useEffect(() => {
    if (accepted && session.orgCount > 0) router.replace("/");
  }, [accepted, session.orgCount, router]);

  async function accept() {
    if (accepting.current) return;
    accepting.current = true;
    setBusy(true);
    setError("");
    try {
      await acceptInvitation(invitationId);
      setAccepted(true);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : ACCEPT_ERROR);
      setBusy(false);
    } finally {
      accepting.current = false;
    }
  }

  const data = invitation.data;
  const invalid = !invitation.isPending && (!data || data.status !== "pending");

  if (invitation.isError && !accepted) {
    return (
      <ScrollView testID="convite-scroll" className="flex-1 bg-background" contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 16, paddingTop: insets.top + 16 }}>
        <View className="mx-auto w-full max-w-sm">
          <ErrorView onRetry={() => void invitation.refetch()} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView testID="convite-scroll" className="flex-1 bg-background" contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 16, paddingTop: insets.top + 16 }}>
      <View className="mx-auto w-full max-w-sm items-center gap-6 rounded-2xl border border-border bg-card p-6">
        <BrandMark className="size-12 rounded-2xl" size={24} />
        {accepted ? (
          <View className="items-center gap-3 py-4">
            <ActivityIndicator />
            <Text className="text-center text-sm text-muted-foreground">Entrando…</Text>
          </View>
        ) : invitation.isPending ? (
          <View accessibilityLabel="Carregando" aria-busy className="w-full gap-3">
            <Skeleton className="mx-auto h-12 w-12 rounded-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </View>
        ) : invalid ? (
          <>
            <View className="size-12 items-center justify-center rounded-full bg-muted">
              <Icon icon={MailX} color="muted" size={24} />
            </View>
            <View className="gap-1.5">
              <Text accessibilityRole="header" className="text-center text-2xl font-semibold tracking-tight">Convite indisponível</Text>
              <Text className="text-center text-sm text-muted-foreground">
                Este convite expirou, foi cancelado, já foi usado ou é para outro e-mail. Peça um novo link a quem convidou.
              </Text>
            </View>
            <Button variant="outline" size="lg" className="w-full" onPress={() => router.replace("/")} accessibilityLabel="Ir para o início">Ir para o início</Button>
          </>
        ) : (
          <>
            <View className="size-12 items-center justify-center rounded-full bg-brand-soft">
              <Icon icon={UsersRound} color="brandInk" size={24} />
            </View>
            <View className="gap-1.5">
              <Text accessibilityRole="header" className="text-center text-2xl font-semibold tracking-tight">{`Entrar em ${data?.organizationName}`}</Text>
              <Text className="text-center text-sm text-muted-foreground">{`${data?.inviterEmail} convidou você para cuidar dos pacientes juntos.`}</Text>
            </View>
            <View className="w-full gap-3">
              <Button size="lg" loading={busy} onPress={() => void accept()} accessibilityLabel="Aceitar convite">Aceitar convite</Button>
              {error ? (
                <Alert variant="destructive" icon={TriangleAlert}>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}
