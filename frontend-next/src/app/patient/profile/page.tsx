"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { DEFAULT_PATIENT_ID } from "@/lib/constants";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import type { MedicalRecord } from "@/types/domain";

interface RecordPayload {
  record: MedicalRecord;
}

export default function PatientProfilePage() {
  useAuthRedirect();

  const [patientId, setPatientId] = useState(DEFAULT_PATIENT_ID);
  const [allergies, setAllergies] = useState("");
  const [conditions, setConditions] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadRecord = async () => {
    if (!patientId.trim()) {
      setStatus("Informe o ID do paciente para carregar o prontuário.");
      return;
    }

    try {
      setLoading(true);
      setStatus(null);
      const payload = await apiRequest<RecordPayload>(`/patients/${patientId}/record`);
      setAllergies(payload.record.allergies.join(", "));
      setConditions(payload.record.conditions.join(", "));
      setCurrentMedications(payload.record.currentMedications.join(", "));
      setStatus("Prontuário carregado.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Falha ao carregar prontuário.");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);

    try {
      setLoading(true);
      await apiRequest(`/patients/${patientId}/record`, {
        method: "PATCH",
        body: JSON.stringify({
          allergies: allergies.split(",").map((item) => item.trim()).filter(Boolean),
          conditions: conditions.split(",").map((item) => item.trim()).filter(Boolean),
          currentMedications: currentMedications.split(",").map((item) => item.trim()).filter(Boolean),
        }),
      });
      setStatus("Histórico clínico atualizado com sucesso.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Falha ao atualizar histórico.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <h1>Perfil e Histórico</h1>
      <p className="muted">Atualização de histórico permitido ao paciente.</p>
      <form className="card" onSubmit={submit}>
        <label>
          ID do paciente
          <input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="patient_4" />
        </label>
        <div className="row">
          <button type="button" onClick={() => void loadRecord()} disabled={loading}>
            {loading ? "Processando..." : "Carregar prontuário atual"}
          </button>
        </div>
        <label>
          Alergias (separadas por vírgula)
          <input value={allergies} onChange={(e) => setAllergies(e.target.value)} />
        </label>
        <label>
          Condições
          <input value={conditions} onChange={(e) => setConditions(e.target.value)} />
        </label>
        <label>
          Medicamentos em uso
          <input value={currentMedications} onChange={(e) => setCurrentMedications(e.target.value)} />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Atualizar histórico"}
        </button>
        {status && <p className="muted">{status}</p>}
      </form>
    </main>
  );
}
