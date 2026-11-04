import { cloneElement, isValidElement } from "react";
import { Label } from "@/components/ui/label";

type Props = {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactElement<{ "aria-describedby"?: string; "aria-invalid"?: boolean }>;
};

/** Rótulo + controle + dica/erro, com aria-describedby e aria-invalid ligados ao controle. */
export function FormField({ label, htmlFor, hint, error, children }: Props) {
  const hintId = `${htmlFor}-hint`;
  const errorId = `${htmlFor}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  const control = isValidElement(children)
    ? cloneElement(children, { "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })
    : children;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {control}
      {hint && <p id={hintId} className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={errorId} role="alert" className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
