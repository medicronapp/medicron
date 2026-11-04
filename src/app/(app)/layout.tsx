import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getOrgContext } from "@/lib/session";
import { BrandMark } from "@/components/brand-mark";
import { BottomNav } from "@/components/app-shell/bottom-nav";
import { SidebarNav } from "@/components/app-shell/sidebar-nav";
import { OrgSwitcher } from "@/components/app-shell/org-switcher";
import { UserMenu } from "@/components/app-shell/user-menu";
import { Toaster } from "@/components/ui/sonner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { orgId } = await getOrgContext();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;

  return (
    <div className="min-h-dvh md:pl-64">
      <SidebarNav />
      <header className="sticky top-0 z-30 border-b bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <BrandMark className="size-8 md:hidden" />
            <OrgSwitcher activeId={orgId} />
          </div>
          <UserMenu name={user?.name ?? "Usuário"} email={user?.email ?? ""} />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pt-6 pb-28 md:pb-10">{children}</main>
      <BottomNav />
      <Toaster position="top-center" richColors />
    </div>
  );
}
