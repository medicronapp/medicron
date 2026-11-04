import { PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm", className)}>
      <PawPrint aria-hidden className="size-5" />
    </span>
  );
}
