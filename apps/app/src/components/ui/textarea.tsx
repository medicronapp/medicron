import { Input } from "./input";

/** Campo de texto longo do site: o `Input`, com várias linhas. */
export const Textarea = ({ className, ...props }: React.ComponentProps<typeof Input>) => (
  <Input multiline textAlignVertical="top" className={`h-auto min-h-20 py-2 ${className ?? ""}`} {...props} />
);
