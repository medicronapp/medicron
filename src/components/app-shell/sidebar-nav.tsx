"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActive } from "./nav-items";

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col gap-6 border-r bg-sidebar p-4 md:flex">
      <Link href="/" className="flex items-center gap-2.5 px-2 py-1">
        <BrandMark />
        <span className="text-lg font-semibold tracking-tight">Medicron</span>
      </Link>
      <nav aria-label="Principal">
        <ul className="grid gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                    active ? "bg-brand-soft text-brand-ink" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon aria-hidden className="size-5" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
