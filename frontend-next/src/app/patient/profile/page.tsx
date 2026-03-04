"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";

export default function PatientProfilePage() {
  useAuthRedirect();

  const [patientId, setPatientId] = useState("");
  const [allergies, setAllergies] = useState("");
  const [conditions, setConditions] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
