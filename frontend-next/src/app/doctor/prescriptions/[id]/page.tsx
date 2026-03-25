"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import type { Prescription } from "@/types/domain";

export default function PrescriptionDetailsPage() {
  useAuthRedirect();

  const params = useParams<{ id: string }>();
  const prescriptionId = params.id;
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const rx = await apiRequest<Prescription>(`/prescriptions/${prescriptionId}`);
        setPrescription(rx);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar prescrição.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [prescriptionId]);

  return (
    <main>
      <h1>Detalhes da Prescrição</h1>
      <p className="muted">ID: {prescriptionId}</p>
      <Link href={`/doctor/anamnesis/${prescriptionId}`}>Ver prescrição de IA detalhada</Link>

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
    </main>
  );
}
