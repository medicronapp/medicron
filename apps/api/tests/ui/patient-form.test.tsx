// @vitest-environment jsdom
import { expect, test } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { PatientForm } from "@/components/patient-form";
import type { Patient } from "@/lib/db/schema";

test("formulário pede o tipo do paciente com as quatro opções e usa texto neutro", () => {
  render(<PatientForm action={async () => {}} />);
  const select = screen.getByLabelText("Tipo");
  expect(select).toBeRequired();
  expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual(["Selecione…", "Gato", "Cachorro", "Pessoa", "Outro"]);
  expect(screen.getByText(/alergias/i)).toBeInTheDocument();
  expect(screen.queryByText(/temperamento|veterin/i)).toBeNull();
});

test("ao editar, o tipo atual vem selecionado", () => {
  const patient = { id: "p", organizationId: "o", name: "Rex", birthDate: null, weightKg: null, species: "dog", notes: null, archivedAt: null, createdAt: new Date() } as Patient;
  render(<PatientForm patient={patient} action={async () => {}} />);
  expect(screen.getByLabelText("Tipo")).toHaveValue("dog");
});
