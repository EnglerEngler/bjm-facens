"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { apiRequest } from "@/lib/api-client";
import { anamnesisBlocks, shouldDisplayQuestion } from "@/lib/anamnesis-questionnaire";
import type { Patient, PatientAnamnesis } from "@/types/domain";

interface PatientAnamnesisPayload {
  patient: Patient;
  anamnesis: PatientAnamnesis;
}

export default function DoctorPatientAnamnesisPage() {
  useAuthRedirect();

  const params = useParams<{ id: string }>();
  const patientId = params.id;

  const [payload, setPayload] = useState<PatientAnamnesisPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const data = await apiRequest<PatientAnamnesisPayload>(`/patients/${patientId}/anamnesis`);
        setPayload(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar anamnese.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [patientId]);

  return (
    <main>
      <h1>Anamnese de {payload?.patient.name?.trim() || patientId}</h1>

      {loading && <p>Carregando anamnese...</p>}
      {error && <p className="error">{error}</p>}

      {payload && (
        <>
          {anamnesisBlocks.map((block) => (
            <section key={block.id} className="card">
              <h3>{block.title}</h3>
              <ul>
                {block.questions
                  .filter((question) => shouldDisplayQuestion(question, payload.anamnesis.answers))
                  .map((question) => (
                    <li key={question.id}>
                      <strong>{question.prompt}</strong>
                      <br />
                      {payload.anamnesis.answers[question.id]?.trim() || "Não respondido."}
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </main>
  );
}
