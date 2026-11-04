"use client";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function OrgSwitcher({ activeId }: { activeId: string }) {
  const router = useRouter();
  const { data: orgs } = authClient.useListOrganizations();
  const active = orgs?.find((o) => o.id === activeId);
  if (!orgs) return <div className="h-11 w-40 animate-pulse rounded-lg bg-muted" aria-hidden />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Conta ativa: ${active?.name ?? ""}`}
        className="flex h-11 min-w-0 max-w-full items-center gap-2 rounded-lg px-2 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="truncate">{active?.name ?? "Escolha uma conta"}</span>
        <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-60">
        {orgs.map((o) => (
          <DropdownMenuItem
            key={o.id}
            className="h-10"
            onClick={async () => {
              await authClient.organization.setActive({ organizationId: o.id });
              router.refresh();
            }}
          >
            <span className="truncate">{o.name}</span>
            {o.id === activeId && <Check aria-hidden className="ml-auto" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="h-10" onClick={() => router.push("/nova-conta")}>
          <Plus aria-hidden /> Nova conta…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
