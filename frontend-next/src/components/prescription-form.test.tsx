import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrescriptionForm } from "@/components/prescription-form";

describe("PrescriptionForm", () => {
  it("exige campos obrigatórios", async () => {
    render(<PrescriptionForm onSubmit={jest.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /salvar prescrição/i }));

    expect(await screen.findByText(/paciente é obrigatório/i)).toBeInTheDocument();
  });

  it("submete dados válidos", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<PrescriptionForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/id do paciente/i), "patient_1");
    await userEvent.type(screen.getByLabelText(/medicamento/i), "dipirona");
    await userEvent.type(screen.getByLabelText(/^dose/i), "500mg");
    await userEvent.type(screen.getByLabelText(/frequência/i), "8/8h");
    await userEvent.type(screen.getByLabelText(/duração/i), "5 dias");
    await userEvent.click(screen.getByRole("button", { name: /salvar prescrição/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
