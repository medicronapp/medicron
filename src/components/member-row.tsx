import { initials } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const ROLE: Record<string, string> = { owner: "Dono", admin: "Administrador", member: "Membro" };

export function MemberRow({ name, email, role }: { name: string; email: string; role: string }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <Avatar size="lg">
        <AvatarFallback className="bg-brand-soft font-semibold text-brand-ink">{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>
      <Badge variant="secondary">{ROLE[role] ?? role}</Badge>
    </li>
  );
}
