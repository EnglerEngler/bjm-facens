"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import type { Patient } from "@/types/domain";

const formatDate = (value?: string | null) => {
  if (!value) return "Nascimento pendente";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
};

const buildPatientSearch = (patient: Patient) =>
  [
    patient.id,
    patient.userId,
    patient.birthDate ?? "",
    patient.clinicId ?? "",
    patient.record?.allergies.join(" ") ?? "",
    patient.record?.conditions.join(" ") ?? "",
    patient.record?.currentMedications.join(" ") ?? "",
  ]
    .join(" ")
    .toLowerCase();

export default function DoctorDashboardPage() {
  useAuthRedirect();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiRequest<Patient[]>("/patients");
        setPatients(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar pacientes.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const filteredPatients = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return patients;
    return patients.filter((patient) => buildPatientSearch(patient).includes(text));
  }, [patients, query]);

  return (
    <main className="doctor-dashboard">
      <section className="doctor-hero doctor-hero-compact">
        <div>
          <span className="doctor-kicker">Painel do medico</span>
          <h1>Buscar paciente e abrir prontuario</h1>
          <p className="muted">Pesquise por qualquer termo disponivel do paciente e siga direto para o prontuario.</p>
        </div>
        <Link href="/doctor/prescriptions/new" className="doctor-action-button doctor-action-button-primary">
          Nova prescricao
        </Link>
      </section>

      <section className="doctor-search card">
        <div className="doctor-search-heading">
          <div>
            <h2>Buscar paciente</h2>
            <p className="muted">ID do perfil, usuario, nascimento, alergias, condicoes ou medicamentos em uso.</p>
          </div>
          <span className="doctor-result-chip">{filteredPatients.length} paciente(s)</span>
        </div>

        <label htmlFor="doctor-dashboard-search" className="sr-only">
          Buscar paciente
        </label>
        <input
          id="doctor-dashboard-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex.: patient_, user_, dipirona, hipertensao, 1990"
          className="doctor-search-input"
        />

        {loading && <p>Carregando pacientes...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <div className="doctor-patient-list">
            {filteredPatients.map((patient) => (
              <article key={patient.id} className="doctor-patient-row">
                <div className="doctor-patient-row-main">
                  <strong>{patient.id}</strong>
                  <p className="muted">Usuario: {patient.userId}</p>
                </div>
                <div className="doctor-patient-row-tags">
                  <span>{formatDate(patient.birthDate)}</span>
                  <span>{patient.record?.allergies.length ? `${patient.record.allergies.length} alergia(s)` : "Sem alergias"}</span>
                </div>
                <Link href={`/doctor/patients/${patient.id}`} className="doctor-action-button doctor-action-button-primary">
                  Abrir prontuario
                </Link>
              </article>
            ))}
            {filteredPatients.length === 0 && <p className="muted">Nenhum paciente encontrado para a busca atual.</p>}
          </div>
        )}
      </section>
    </main>
  );
}
