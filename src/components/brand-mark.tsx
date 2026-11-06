import { cn } from "@/lib/utils";

/** Logo: uma cruz dentro de um círculo — cuidado e saúde, sem remeter a nenhum tipo de paciente. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm", className)}>
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="size-5">
        <circle cx="12" cy="12" r="7.5" />
        <path d="M12 8.6v6.8M8.6 12h6.8" />
      </svg>
    </span>
  );
}
