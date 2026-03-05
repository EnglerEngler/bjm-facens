"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import type { MedicalRecord, MedicalRecordHistoryEntry, Patient } from "@/types/domain";

interface PatientRecordPayload {
  patient: Patient;
  record: MedicalRecord;
}

export default function DoctorPatientRecordPage() {
  useAuthRedirect();

  const params = useParams<{ id: string }>();
  const patientId = params.id;

  const [payload, setPayload] = useState<PatientRecordPayload | null>(null);
  const [history, setHistory] = useState<MedicalRecordHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const [record, recordHistory] = await Promise.all([
          apiRequest<PatientRecordPayload>(`/patients/${patientId}/record`),
          apiRequest<MedicalRecordHistoryEntry[]>(`/patients/${patientId}/record/history`),
        ]);
        setPayload(record);
        setHistory(recordHistory);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao abrir prontuário.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [patientId]);

  return (
    <main>
      <h1>Prontuário do Paciente</h1>
      <p className="muted">Paciente: {patientId}</p>

      {loading && <p>Carregando prontuário...</p>}
      {error && <p className="error">{error}</p>}

      {payload && (
        <>
          <section className="card">
            <h3>Dados Clínicos Críticos</h3>
            <p>
              <strong>Alergias:</strong> {payload.record.allergies.join(", ") || "Nenhuma"}
            </p>
            <p>
              <strong>Condições:</strong> {payload.record.conditions.join(", ") || "Nenhuma"}
            </p>
            <p>
              <strong>Medicamentos em uso:</strong> {payload.record.currentMedications.join(", ") || "Nenhum"}
            </p>
            <p className="muted">Atualizado em: {new Date(payload.record.lastUpdatedAt).toLocaleString()}</p>
            <div className="row">
              <Link href={`/doctor/prescriptions/new?patientId=${patientId}`}>Criar nova prescrição</Link>
              <Link href={`/doctor/patients/${patientId}/anamnesis`}>Ver anamnese completa</Link>
            </div>
          </section>

          <section className="card">
            <h3>Histórico de alterações</h3>
            {history.length === 0 ? (
              <p className="muted">Sem alterações registradas.</p>
            ) : (
              <ul>
                {history.map((entry) => (
                  <li key={entry.id}>
                    {new Date(entry.createdAt).toLocaleString()} - alterado por {entry.changedByUserId}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
