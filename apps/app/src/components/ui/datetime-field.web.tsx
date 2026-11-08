import { createElement } from "react";
import { useColors } from "@/theme/colors";

type Props = { value: string; onChange: (v: string) => void; clearable?: boolean; accessibilityLabel?: string };

/** No navegador, o campo nativo do navegador (igual ao do site). */
export function DateTimeField({ value, onChange, accessibilityLabel }: Props) {
  const colors = useColors();
  return createElement("input", {
    type: "datetime-local", value, "aria-label": accessibilityLabel, onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    style: { height: 44, width: "100%", boxSizing: "border-box", padding: "0 12px", fontSize: 16, color: colors.foreground, background: "transparent", border: "1px solid var(--input, #ccc)", borderRadius: 8 },
  });
}
