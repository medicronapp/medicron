import { Text as RNText } from "react-native";
import { screen } from "@testing-library/react-native";
import { renderApp } from "./helpers";
import { HeroCard } from "@/components/ui/hero-card";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { ProgressRing } from "@/components/progress-ring";

describe("StatusBadge", () => {
  test.each([
    ["overdue", "Atrasada"], ["now", "Agora"], ["upcoming", "Próxima"], ["done", "Feito"], ["skipped", "Pulado"],
  ] as const)("%s mostra '%s' (ícone + texto)", async (tone, label) => {
    await renderApp(<StatusBadge tone={tone} />);
    expect(screen.getByText(label)).toBeOnTheScreen();
  });
});

describe("PageHeader", () => {
  test("título como cabeçalho e descrição", async () => {
    await renderApp(<PageHeader title="Hoje" description="sábado, 7 de novembro" />);
    expect(screen.getByRole("header", { name: "Hoje" })).toBeOnTheScreen();
    expect(screen.getByText("sábado, 7 de novembro")).toBeOnTheScreen();
  });
  test("sem descrição", async () => {
    await renderApp(<PageHeader title="Pacientes" />);
    expect(screen.getByRole("header", { name: "Pacientes" })).toBeOnTheScreen();
  });
});

describe("ProgressRing", () => {
  test("rótulo de acessibilidade e contador x/y", async () => {
    await renderApp(<ProgressRing resolved={3} total={8} />);
    expect(screen.getByLabelText("3 de 8 cuidados de hoje resolvidos")).toBeOnTheScreen();
    expect(screen.getByText("3/8")).toBeOnTheScreen();
  });
  test("0/0 não quebra", async () => {
    await renderApp(<ProgressRing resolved={0} total={0} />);
    expect(screen.getByText("0/0")).toBeOnTheScreen();
  });
});

describe("HeroCard", () => {
  test("renderiza os filhos", async () => {
    await renderApp(<HeroCard><RNText>conteúdo</RNText></HeroCard>);
    expect(screen.getByText("conteúdo")).toBeOnTheScreen();
  });
});
