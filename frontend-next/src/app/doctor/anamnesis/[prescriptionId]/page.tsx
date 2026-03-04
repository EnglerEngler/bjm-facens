"use client";

export const dynamic = "force-dynamic";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AnamnesisCard } from "@/components/anamnesis-card";
import { apiRequest } from "@/lib/api-client";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import type { AIAssessment } from "@/types/domain";

export default function DoctorAnamnesisPage() {
  useAuthRedirect();

  const params = useParams<{ prescriptionId: string }>();
  const prescriptionId = params.prescriptionId;
  const [assessment, setAssessment] = useState<AIAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const data = await apiRequest<AIAssessment>(`/ai/anamnesis/${prescriptionId}`);
        setAssessment(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar anamnese.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [prescriptionId]);

  return (
    <main>
      <h1>Anamnese IA</h1>
      {loading && <p>Gerando anamnese...</p>}
      {error && <p className="error">{error}</p>}
      {assessment && <AnamnesisCard assessment={assessment} />}
    </main>
  );
}
