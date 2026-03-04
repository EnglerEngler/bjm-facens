import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AlertDecisionForm } from "@/components/alert-decision-form";

describe("AlertDecisionForm", () => {
  it("exige justificativa para alerta crítico", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <AlertDecisionForm
        alert={{
          id: "alert_1",
          prescriptionId: "rx_1",
          patientId: "patient_1",
          severity: "critical",
          ruleCode: "ALLERGY_BLOCK",
          message: "Alergia severa",
          evidence: [],
          status: "open",
          createdAt: new Date().toISOString(),
        }}
        onSubmit={onSubmit}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /aceitar/i }));

    expect(await screen.findByText(/alerta crítico exige justificativa/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
