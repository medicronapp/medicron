// @vitest-environment jsdom
import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { Pill } from "lucide-react";

import { AddLink } from "@/components/add-link";
import { ListRow } from "@/components/list-row";

test("AddLink é um link com o botão padrão e o rótulo informado", () => {
  render(<AddLink href="/gatos/novo" label="Novo gato" />);
  const link = screen.getByRole("link", { name: "Novo gato" });
  expect(link).toHaveAttribute("href", "/gatos/novo");
  expect(link.className).toContain("bg-primary");
});

test("ListRow com href é um link e com título longo trunca", () => {
  const name = "N".repeat(80);
  render(<ListRow href="/itens/1" icon={Pill} title={name} subtitle="Medicação" />);
  const link = screen.getByRole("link");
  expect(link).toHaveAttribute("href", "/itens/1");
  const title = screen.getByText(name);
  expect(title.className).toContain("truncate");
  expect(title.className).toContain("text-base");
  expect(screen.getByText("Medicação").className).toContain("text-sm");
});

test("ListRow sem href é um bloco com ações à direita e conteúdo extra", () => {
  render(
    <ListRow icon={Pill} title="Agemoxi" trailing={<button>Editar</button>}>
      <span>A cada 8 horas</span>
    </ListRow>,
  );
  expect(screen.queryByRole("link")).toBeNull();
  expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
  expect(screen.getByText("A cada 8 horas")).toBeInTheDocument();
});
