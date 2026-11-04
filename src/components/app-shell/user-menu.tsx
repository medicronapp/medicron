"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Monitor, Moon, Sun, UserRound } from "lucide-react";
import { useTheme } from "next-themes";
import { authClient } from "@/lib/auth-client";
import { initials } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const { setTheme } = useTheme();

  async function signOut() {
    await authClient.signOut();
    router.push("/entrar");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu do usuário"
        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Avatar size="lg">
          <AvatarFallback className="bg-brand-soft font-semibold text-brand-ink">{initials(name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="grid gap-0.5">
            <span className="truncate text-sm font-medium text-foreground">{name}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/conta" />} className="h-10">
          <UserRound aria-hidden /> Minha conta
        </DropdownMenuItem>
        <DropdownMenuItem className="h-10" onClick={() => setTheme("light")}><Sun aria-hidden /> Tema claro</DropdownMenuItem>
        <DropdownMenuItem className="h-10" onClick={() => setTheme("dark")}><Moon aria-hidden /> Tema escuro</DropdownMenuItem>
        <DropdownMenuItem className="h-10" onClick={() => setTheme("system")}><Monitor aria-hidden /> Tema do sistema</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="h-10 text-destructive" onClick={signOut}>
          <LogOut aria-hidden /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
