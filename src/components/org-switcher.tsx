"use client";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function OrgSwitcher({ activeId }: { activeId: string }) {
  const router = useRouter();
  const { data: orgs } = authClient.useListOrganizations();
  if (!orgs) return null;
  return (
    <select
      aria-label="Conta ativa"
      value={activeId}
      className="h-10 max-w-[60%] rounded-md border bg-background px-2 text-sm"
      onChange={async (e) => {
        if (e.target.value === "__new") return router.push("/nova-conta");
        await authClient.organization.setActive({ organizationId: e.target.value });
        router.refresh();
      }}
    >
      {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      <option value="__new">+ Nova conta…</option>
    </select>
  );
}
