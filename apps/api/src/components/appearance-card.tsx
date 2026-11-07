"use client";
import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const;

export function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  // false no servidor e na hidratação: o tema real só existe no navegador (localStorage).
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const current = mounted ? (theme ?? "system") : null;
  return (
    <fieldset className="grid grid-cols-3 gap-2">
      <legend className="sr-only">Tema do aplicativo</legend>
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <label
          key={value}
          className={cn(
            "flex h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border text-sm font-medium transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
            current === value ? "border-primary bg-brand-soft text-brand-ink" : "text-muted-foreground hover:bg-muted",
          )}
        >
          <input
            type="radio" name="theme" value={value} checked={current === value}
            onChange={() => setTheme(value)} className="sr-only" aria-label={label}
          />
          <Icon aria-hidden className="size-5" />
          {label}
        </label>
      ))}
    </fieldset>
  );
}
