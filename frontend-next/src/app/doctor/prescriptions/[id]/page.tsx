"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AlertBadge } from "@/components/alert-badge";
import { apiRequest } from "@/lib/api-client";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import type { Prescription, RiskAlert } from "@/types/domain";

export default function PrescriptionDetailsPage() {
  useAuthRedirect();

  const params = useParams<{ id: string }>();
  const prescriptionId = params.id;
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [rx, alertList] = await Promise.all([
        apiRequest<Prescription>(`/prescriptions/${prescriptionId}`),
        apiRequest<RiskAlert[]>(`/prescriptions/${prescriptionId}/alerts`),
      ]);
      setPrescription(rx);
      setAlerts(alertList);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar prescrição.");
    } finally {
      setLoading(false);
    }
  }, [prescriptionId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const decide = async (alertId: string, action: "accepted" | "reviewed" | "ignored") => {
    const justification = window.prompt("Justificativa (obrigatória para alerta crítico):") ?? undefined;
    try {
      await apiRequest(`/prescriptions/alerts/${alertId}/decision`, {
        method: "POST",
        body: JSON.stringify({ action, justification }),
      });
      setStatusMessage("Decisão registrada com sucesso.");
      await loadData();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Falha ao registrar decisão.");
    }
  };

  return (
    <main>
      <h1>Detalhes da Prescrição</h1>
      <p className="muted">ID: {prescriptionId}</p>
      <Link href={`/doctor/anamnesis/${prescriptionId}`}>Ver anamnese IA detalhada</Link>

      {loading && <p>Carregando...</p>}
      {error && <p className="error">{error}</p>}

      {prescription && (
        <section className="card">
          <h3>Itens prescritos</h3>
          <ul>
            {prescription.items.map((item, idx) => (
              <li key={`${item.medication}-${idx}`}>
                {item.medication} - {item.dose} - {item.frequency} - {item.duration} - via {item.route}
              </li>
            ))}
          </ul>
          {prescription.conduct && <p><strong>Conduta:</strong> {prescription.conduct}</p>}
        </section>
      )}

      <section className="card">
        <h3>Alertas Clínicos</h3>
        {alerts.length === 0 && <p className="muted">Sem alertas para esta prescrição.</p>}
        {alerts.map((alert) => (
          <article key={alert.id} className="card">
            <div className="between">
              <strong>{alert.ruleCode}</strong>
              <AlertBadge severity={alert.severity} />
            </div>
            <p>{alert.message}</p>
            <p className="muted">Status: {alert.status}</p>
            <div className="row">
              <button type="button" onClick={() => void decide(alert.id, "accepted")}>Aceitar</button>
              <button type="button" onClick={() => void decide(alert.id, "reviewed")}>Revisar</button>
              <button type="button" onClick={() => void decide(alert.id, "ignored")}>Ignorar</button>
            </div>
          </article>
        ))}
        {statusMessage && <p className="muted">{statusMessage}</p>}
      </section>
    </main>
  );
}
