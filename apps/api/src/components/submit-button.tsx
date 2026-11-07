"use client";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SubmitButton({ children, pendingLabel = "Salvando…", ...props }: React.ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} {...props}>
      {pending && <Loader2 aria-hidden className="animate-spin" />}
      {pending ? pendingLabel : children}
    </Button>
  );
}
