// @vitest-environment jsdom
import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { Pill } from "lucide-react";

import { AddLink } from "@/components/add-link";
import { ListRow } from "@/components/list-row";
import { SpeciesIcon } from "@/components/species-icon";

test("AddLink é um link com o botão padrão e o rótulo informado", () => {
  render(<AddLink href="/pacientes/novo" label="Novo paciente" />);
  const link = screen.getByRole("link", { name: "Novo paciente" });
  expect(link).toHaveAttribute("href", "/pacientes/novo");
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

test("SpeciesIcon desenha um ícone decorativo para cada tipo", () => {
  for (const s of ["cat", "dog", "human", "other"] as const) {
    const { container, unmount } = render(<SpeciesIcon species={s} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
    unmount();
  }
});
