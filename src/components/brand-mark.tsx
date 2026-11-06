import { cn } from "@/lib/utils";

/** Logo: um anel quase fechado (o ciclo de doses) com a dose marcada na abertura. Não remete a nenhum tipo de paciente. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm", className)}>
      <svg aria-hidden viewBox="0 0 64 64" fill="none" className="size-6">
        <circle
          cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
          strokeDasharray="104 21.7" transform="rotate(-90 32 32)"
        />
        <circle cx="22" cy="14.7" r="5.2" fill="#99f6e4" />
      </svg>
    </span>
  );
}
