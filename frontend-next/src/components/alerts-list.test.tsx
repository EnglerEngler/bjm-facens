import { render, screen } from "@testing-library/react";
import { AlertsList } from "@/components/alerts-list";

describe("AlertsList", () => {
  it("renderiza alertas com severidade", () => {
    render(
      <AlertsList
        alerts={[
          {
            id: "alert_1",
            prescriptionId: "rx_1",
            patientId: "patient_1",
            severity: "critical",
            ruleCode: "ALLERGY_BLOCK",
            message: "Alergia severa registrada",
            evidence: ["allergy:dipirona"],
            status: "open",
            createdAt: new Date().toISOString(),
          },
        ]}
      />,
    );

    expect(screen.getByText(/allergy_block/i)).toBeInTheDocument();
    expect(screen.getByText(/critical/i)).toBeInTheDocument();
    expect(screen.getByText(/alergia severa registrada/i)).toBeInTheDocument();
  });
});
