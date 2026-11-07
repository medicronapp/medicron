import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronsUpDown, LogOut, Plus, UserRound } from "lucide-react-native";
import { authClient } from "@/lib/auth-client";
import { apiClient } from "@/lib/api";
import { fetchMe } from "@/lib/api/me";
import { queryClient } from "@/lib/api/query";
import { useAppSession } from "@/lib/session";
import { initials } from "@/lib/initials";
import { BrandMark } from "@/components/brand-mark";
import { Icon } from "@/components/ui/icon";
import { Avatar } from "@/components/ui/avatar";
import { Text } from "@/components/ui/text";
import { MenuSheet } from "@/components/ui/menu-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

/** Cabeçalho fixo: marca (só no celular), seletor de conta e menu do usuário. */
export function AppHeader({ showBrand = true }: { showBrand?: boolean }) {
  const router = useRouter();
  const { activeOrgId, signOut } = useAppSession();
  const { data: orgs } = authClient.useListOrganizations();
  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe(apiClient) });
  const [orgsOpen, setOrgsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const currentOrgId = me.data?.orgId ?? activeOrgId; // o servidor escolhe a conta quando a sessão ainda não tem uma
  const active = orgs?.find((o) => o.id === currentOrgId);
  const name = me.data?.user.name ?? "Usuário";

  async function switchOrg(id: string) {
    try {
      await authClient.organization.setActive({ organizationId: id });
      await queryClient.invalidateQueries(); // como o router.refresh() do site: tudo é da conta nova
    } catch {
      toast.error("Não foi possível trocar de conta.");
    }
  }

  async function leave() {
    await signOut();
    router.replace("/entrar");
  }

  return (
    <View className="h-14 flex-row items-center justify-between gap-2 border-b border-border bg-background px-4">
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        {showBrand ? <BrandMark className="size-8" /> : null}
        {orgs ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Conta ativa: ${active?.name ?? ""}`}
            onPress={() => setOrgsOpen(true)}
            className="h-11 min-w-0 shrink flex-row items-center gap-2 rounded-lg px-2 active:bg-muted"
          >
            <Text numberOfLines={1} className="shrink text-sm font-medium">{active?.name ?? "Escolha uma conta"}</Text>
            <Icon icon={ChevronsUpDown} color="muted" size={16} />
          </Pressable>
        ) : (
          <Skeleton className="h-11 w-40 rounded-lg" />
        )}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Menu do usuário" onPress={() => setUserOpen(true)} className="size-11 items-center justify-center rounded-full">
        <Avatar size="lg" fallback={initials(name)} className="bg-brand-soft" textClassName="font-semibold text-brand-ink" />
      </Pressable>

      <MenuSheet
        open={orgsOpen}
        onOpenChange={setOrgsOpen}
        title="Contas"
        items={[
          ...(orgs ?? []).map((o) => ({ key: o.id, label: o.name, selected: o.id === currentOrgId, onPress: () => void switchOrg(o.id) })),
          { key: "nova", label: "Nova conta…", icon: Plus, onPress: () => router.push("/nova-conta") },
        ]}
      />
      <MenuSheet
        open={userOpen}
        onOpenChange={setUserOpen}
        title={name}
        items={[
          { key: "conta", label: "Minha conta", icon: UserRound, onPress: () => router.push("/conta") },
          { key: "sair", label: "Sair", icon: LogOut, destructive: true, onPress: () => void leave() },
        ]}
      />
    </View>
  );
}
