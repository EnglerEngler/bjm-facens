"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { loadPatientPrescriptions, type PatientPrescriptionView } from "@/lib/prescriptions-service";

export default function PatientDashboardPage() {
  useAuthRedirect();

  const [prescriptions, setPrescriptions] = useState<PatientPrescriptionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const data = await loadPatientPrescriptions();
        setPrescriptions(data.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar prescrições.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <main>
      <h1>Dashboard do Paciente</h1>
      <p className="muted">Prescrições e orientações liberadas.</p>

      {loading && <p>Carregando prescrições...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <section className="card">
          <ul>
            {prescriptions.map((rx) => (
              <li key={rx.id}>
                {rx.id} - status {rx.status} - {rx.items.length} item(ns)
                <br />
                <span className="muted">Orientação: {rx.orientation}</span>
              </li>
            ))}
          </ul>
          {prescriptions.length === 0 && <p className="muted">Sem prescrições disponíveis.</p>}
        </section>
      )}
    </main>
  );
}
