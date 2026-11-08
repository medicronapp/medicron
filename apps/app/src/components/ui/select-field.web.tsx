import { createElement } from "react";
import { useColors } from "@/theme/colors";
import type { SelectOption } from "./select-field";

type Props = { value: string; onChange: (v: string) => void; options: SelectOption[]; placeholder?: string; accessibilityLabel?: string; invalid?: boolean };

/** No navegador, o `<select>` do próprio navegador (igual ao do site). */
export function SelectField({ value, onChange, options, placeholder, accessibilityLabel, invalid }: Props) {
  const colors = useColors();
  const groups = [...new Set(options.map((o) => o.group))];
  const opt = (o: SelectOption) => createElement("option", { key: o.value, value: o.value }, o.label);
  return createElement(
    "select",
    {
      value, "aria-label": accessibilityLabel, "aria-invalid": invalid || undefined,
      onChange: (e: { target: { value: string } }) => onChange(e.target.value),
      style: { height: 44, width: "100%", padding: "0 12px", fontSize: 16, color: colors.foreground, background: "transparent", border: `1px solid ${invalid ? colors.destructive : "var(--input, #ccc)"}`, borderRadius: 8 },
    },
    createElement("option", { value: "" }, placeholder ?? ""),
    groups.map((g) => (g ? createElement("optgroup", { key: g, label: g }, options.filter((o) => o.group === g).map(opt)) : options.filter((o) => !o.group).map(opt))),
  );
}
