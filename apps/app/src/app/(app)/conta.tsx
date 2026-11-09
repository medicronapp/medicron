import { View } from "react-native";
import { useMe } from "@/lib/me-query";
import { useActiveOrganization } from "@/lib/org";
import { AppearanceCard } from "@/components/appearance-card";
import { DeleteAccount } from "@/components/delete-account";
import { EnableNotifications } from "@/components/enable-notifications";
import { ErrorView } from "@/components/error-view";
import { InvitationRow } from "@/components/invitation-row";
import { InviteForm } from "@/components/invite-form";
import { MemberRow } from "@/components/member-row";
import { PageHeader } from "@/components/page-header";
import { Screen } from "@/components/screen";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";

export default function Conta() {
  const org = useActiveOrganization();
  const me = useMe();
  const refetchAll = () => { void org.refetch(); void me.refetch(); };

  if (org.isPending || me.isPending) {
    return (
      <Screen>
        <View accessibilityLabel="Carregando" aria-busy className="gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </View>
      </Screen>
    );
  }
  if (org.error || !org.data || me.isError || !me.data) {
    return (
      <Screen>
        <ErrorView onRetry={refetchAll} />
      </Screen>
    );
  }

  const canInvite = me.data.role === "owner" || me.data.role === "admin";
  const pending = org.data.invitations.filter((i) => i.status === "pending");
  return (
    <Screen testID="conta-scroll" onRefresh={refetchAll}>
      <PageHeader title={org.data.name ?? "Conta"} description="Pessoas, convites e preferências desta conta." />

      <EnableNotifications />

      <Card>
        <CardHeader>
          <CardTitle>Pessoas nesta conta</CardTitle>
          <CardDescription>Todas veem e registram os mesmos cuidados.</CardDescription>
        </CardHeader>
        <CardContent>
          {org.data.members.map((m, i) => (
            <View key={m.id} className={i > 0 ? "border-t border-border" : undefined}>
              <MemberRow name={m.user.name} email={m.user.email} role={m.role} />
            </View>
          ))}
        </CardContent>
      </Card>

      {canInvite ? (
        <Card>
          <CardHeader>
            <CardTitle>Convidar alguém</CardTitle>
            <CardDescription>Gere um link e envie por mensagem. Vale por 7 dias.</CardDescription>
          </CardHeader>
          <CardContent className="gap-5">
            <InviteForm />
            {pending.length > 0 ? (
              <View>
                <Text accessibilityRole="header" className="mb-1 text-sm font-semibold">Convites pendentes</Text>
                {pending.map((i, k) => (
                  <View key={i.id} className={k > 0 ? "border-t border-border" : undefined}>
                    <InvitationRow id={i.id} email={i.email} />
                  </View>
                ))}
              </View>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
        </CardHeader>
        <CardContent>
          <AppearanceCard />
        </CardContent>
      </Card>

      <DeleteAccount />
    </Screen>
  );
}
