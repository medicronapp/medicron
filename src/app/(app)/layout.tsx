import { getOrgContext } from "@/lib/session";
import { BottomNav } from "@/components/bottom-nav";
import { OrgSwitcher } from "@/components/org-switcher";
import { Toaster } from "@/components/ui/sonner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { orgId } = await getOrgContext();
  return (
    <div className="mx-auto min-h-dvh max-w-2xl pb-24">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 px-4 py-2 backdrop-blur">
        <span className="font-semibold">🐱 Medicron</span>
        <OrgSwitcher activeId={orgId} />
      </header>
      <main className="px-4 py-4">{children}</main>
      <BottomNav />
      <Toaster position="top-center" />
    </div>
  );
}
