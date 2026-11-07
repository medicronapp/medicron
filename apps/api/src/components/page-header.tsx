import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type Props = { title: string; description?: string; actions?: React.ReactNode; backHref?: string };

export function PageHeader({ title, description, actions, backHref }: Props) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {backHref && (
          <Link
            href={backHref}
            aria-label="Voltar"
            className="-ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="truncate">{title}</h1>
          {description && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
