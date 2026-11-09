import { View } from "react-native";
import { initials } from "@/lib/initials";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";

const ROLE: Record<string, string> = { owner: "Dono", admin: "Administrador", member: "Membro" };

export function MemberRow({ name, email, role }: { name: string; email: string; role: string }) {
  return (
    <View className="flex-row items-center gap-3 py-3">
      <Avatar size="lg" fallback={initials(name)} className="bg-brand-soft" textClassName="font-semibold text-brand-ink" />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-sm font-medium">{name}</Text>
        <Text numberOfLines={1} className="text-xs text-muted-foreground">{email}</Text>
      </View>
      <Badge variant="secondary">{ROLE[role] ?? role}</Badge>
    </View>
  );
}
