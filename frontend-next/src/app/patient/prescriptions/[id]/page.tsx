"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { apiRequest } from "@/lib/api-client";
import { OpenPrescriptionPdfButton } from "@/components/open-prescription-pdf-button";
import type { Prescription } from "@/types/domain";

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
};

export default function PatientPrescriptionDetailsPage() {
  useAuthRedirect();

  const params = useParams<{ id: string }>();
  const prescriptionId = params.id;
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiRequest<Prescription>(`/patients/me/prescriptions/${prescriptionId}`);
        setPrescription(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar prescrição.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [prescriptionId]);

  return (
    <main className="doctor-dashboard patient-dashboard">
      <section className="doctor-hero patient-dashboard-hero">
        <div>
          <span className="doctor-kicker">Prescrição</span>
          <h1>Orientacoes liberadas</h1>
          <p className="muted">Consulte a conduta e os medicamentos liberados para você.</p>
        </div>
      </section>

      <section className="card doctor-record-card">
        <div className="doctor-record-header">
          <div>
            <span className="doctor-section-label">Detalhes</span>
            <h2>Prescrição</h2>
            {prescription ? <p className="muted">Liberada em {formatDateTime(prescription.createdAt)}</p> : null}
          </div>
          <Link href="/patient/dashboard" className="doctor-action-button doctor-action-button-secondary">
            Voltar ao dashboard
          </Link>
        </div>

        {loading && <p>Carregando prescrição...</p>}
        {error && <p className="error">{error}</p>}

        {prescription ? (
          <div className="patient-prescription-detail">
            <div className="patient-prescription-actions">
              <OpenPrescriptionPdfButton prescriptionId={prescription.id} className="doctor-action-button doctor-action-button-primary" />
            </div>

            {prescription.conduct ? (
              <section className="doctor-info-panel">
                <span className="doctor-section-label">Conduta</span>
                <p>{prescription.conduct}</p>
              </section>
            ) : null}

            <section className="doctor-info-panel">
              <span className="doctor-section-label">Medicamentos</span>
              <div className="patient-prescription-items">
                {prescription.items.map((item, index) => (
                  <div key={`${item.medication}-${index}`} className="patient-prescription-item">
                    <strong>{item.medication}</strong>
                    <p className="muted">
                      {item.dose} • {item.frequency} • {item.duration} • {item.route}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}
