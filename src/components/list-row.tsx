import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon; title: string; subtitle?: string;
  /** Com href a linha inteira é um link (com seta); sem href é um bloco que aceita `trailing`. */
  href?: string; trailing?: React.ReactNode; children?: React.ReactNode;
};

const ROW = "flex items-center gap-3 rounded-2xl border bg-card p-3.5 shadow-xs";

/** Linha de lista com ícone, título e subtítulo — padrão de Itens, reaproveitado nas rotinas do gato. */
export function ListRow({ icon: Icon, title, subtitle, href, trailing, children }: Props) {
  const content = (
    <>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold">{title}</p>
        {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
        {children}
      </div>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cn(ROW, "transition-colors hover:bg-muted/50")}>
        {content}
        <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
      </Link>
    );
  }
  return (
    <div className={ROW}>
      {content}
      {trailing && <div className="flex shrink-0 items-center gap-2">{trailing}</div>}
    </div>
  );
}
