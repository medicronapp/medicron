import { fireEvent, screen } from "@testing-library/react-native";
import { renderApp } from "./helpers";

jest.mock("@/lib/clock", () => ({ now: () => new Date("2026-11-08T15:00:00.000Z") })); // 12:00 de 08/11/2026 em Brasília

import { Calendar } from "@/components/ui/calendar";
import { DateField } from "@/components/ui/date-field.web";

describe("Calendar", () => {
  test("mostra o mês do valor, marca o dia escolhido e começa a semana no domingo", async () => {
    await renderApp(<Calendar value="2026-11-20" onChange={jest.fn()} />);
    expect(screen.getByText("novembro de 2026")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "20 de novembro de 2026" })).toBeSelected();
    expect(screen.getByRole("button", { name: "21 de novembro de 2026" })).not.toBeSelected();
    expect(screen.getAllByText(/^[DSTQ]$/)).toHaveLength(7);
    // 1º de novembro de 2026 é domingo: sem dias vazios antes; 30 dias no mês
    expect(screen.getAllByRole("button", { name: /de novembro de 2026/ })).toHaveLength(30);
  });

  test("tocar num dia devolve a data 'YYYY-MM-DD'", async () => {
    const onChange = jest.fn();
    await renderApp(<Calendar value="2026-11-20" onChange={onChange} />);
    await fireEvent.press(screen.getByRole("button", { name: "5 de novembro de 2026" }));
    expect(onChange).toHaveBeenCalledWith("2026-11-05");
  });

  test("navega entre os meses e vira o ano", async () => {
    const onChange = jest.fn();
    await renderApp(<Calendar value="2026-12-10" onChange={onChange} />);
    await fireEvent.press(screen.getByRole("button", { name: "Próximo mês" }));
    expect(screen.getByText("janeiro de 2027")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "31 de janeiro de 2027" }));
    expect(onChange).toHaveBeenCalledWith("2027-01-31");
    await fireEvent.press(screen.getByRole("button", { name: "Mês anterior" }));
    await fireEvent.press(screen.getByRole("button", { name: "Mês anterior" }));
    expect(screen.getByText("novembro de 2026")).toBeOnTheScreen();
  });

  test("dias antes do mínimo ficam desligados e o mês anterior ao mínimo não abre", async () => {
    const onChange = jest.fn();
    await renderApp(<Calendar value="2026-11-20" min="2026-11-08" onChange={onChange} />);
    expect(screen.getByRole("button", { name: "7 de novembro de 2026" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "8 de novembro de 2026, hoje" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Mês anterior" })).toBeDisabled();
    await fireEvent.press(screen.getByRole("button", { name: "7 de novembro de 2026" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  test("hoje fica sinalizado", async () => {
    await renderApp(<Calendar value="2026-11-20" onChange={jest.fn()} />);
    expect(screen.getByRole("button", { name: "8 de novembro de 2026, hoje" })).toBeOnTheScreen();
  });
});

describe("DateField no navegador", () => {
  test("mostra a data, abre o calendário num diálogo e fecha ao escolher", async () => {
    const onChange = jest.fn();
    await renderApp(<DateField value="2026-12-01" onChange={onChange} accessibilityLabel="Data final" />);
    expect(screen.getByText("01/12/2026")).toBeOnTheScreen();
    expect(screen.queryByText("dezembro de 2026")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Data final: 01/12/2026" }));
    expect(await screen.findByText("dezembro de 2026")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "15 de dezembro de 2026" }));
    expect(onChange).toHaveBeenCalledWith("2026-12-15");
    expect(screen.queryByText("dezembro de 2026")).toBeNull();
  });

  test("sem valor mostra 'Selecionar'", async () => {
    await renderApp(<DateField value="" onChange={jest.fn()} accessibilityLabel="Data final" />);
    expect(screen.getByText("Selecionar")).toBeOnTheScreen();
  });
});
