// @vitest-environment jsdom
import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Cat } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { FormField } from "@/components/form-field";
import { StatusBadge } from "@/components/status-badge";
import { Input } from "@/components/ui/input";

test("NativeSelect é um combobox que repassa name e defaultValue", () => {
  render(
    <NativeSelect name="kind" defaultValue="b" aria-label="Tipo">
      <option value="a">A</option>
      <option value="b">B</option>
    </NativeSelect>,
  );
  const select = screen.getByRole("combobox", { name: "Tipo" }) as HTMLSelectElement;
  expect(select.name).toBe("kind");
  expect(select.value).toBe("b");
});

test("FormField liga rótulo, dica e erro ao controle", () => {
  render(
    <FormField label="Nome" htmlFor="nome" hint="Como o gato é chamado" error="Obrigatório">
      <Input id="nome" />
    </FormField>,
  );
  const input = screen.getByLabelText("Nome");
  expect(screen.getByRole("alert")).toHaveTextContent("Obrigatório");
  const described = input.getAttribute("aria-describedby") ?? "";
  expect(described.split(" ").length).toBe(2);
  expect(input).toHaveAttribute("aria-invalid", "true");
});

test("PageHeader tem um único h1 e link Voltar quando há backHref", () => {
  render(<PageHeader title="Gatos" backHref="/" />);
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(screen.getByRole("link", { name: "Voltar" })).toHaveAttribute("href", "/");
});

test("PageHeader sem backHref não mostra Voltar", () => {
  render(<PageHeader title="Hoje" />);
  expect(screen.queryByRole("link", { name: "Voltar" })).toBeNull();
});

test("EmptyState mostra título, descrição e ação", () => {
  render(<EmptyState icon={Cat} title="Nenhum gato" description="Cadastre o primeiro" action={<button>Novo</button>} />);
  expect(screen.getByText("Nenhum gato")).toBeInTheDocument();
  expect(screen.getByText("Cadastre o primeiro")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Novo" })).toBeInTheDocument();
});

test("StatusBadge sempre traz texto, não só cor", () => {
  const labels = { overdue: "Atrasada", now: "Agora", upcoming: "Próxima", done: "Feito", skipped: "Pulado" } as const;
  for (const [tone, label] of Object.entries(labels)) {
    const { unmount } = render(<StatusBadge tone={tone as keyof typeof labels} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    unmount();
  }
});
