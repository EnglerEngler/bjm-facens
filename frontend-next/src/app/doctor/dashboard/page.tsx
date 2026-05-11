"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { formatCpf, matchesSearch } from "@/lib/patient-fields";
import type { Patient } from "@/types/domain";

const formatBirthDateForSearch = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
};

export default function DoctorDashboardPage() {
  useAuthRedirect();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
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
    if (!deferredQuery.trim()) return patients;
    return patients.filter((patient) =>
      matchesSearch(
        deferredQuery,
        patient.name ?? "",
        patient.id,
        patient.userId,
        patient.cpf ?? "",
        patient.birthDate ?? "",
        formatBirthDateForSearch(patient.birthDate),
        patient.clinicId ?? "",
        patient.record?.allergies.join(" ") ?? "",
        patient.record?.conditions.join(" ") ?? "",
        patient.record?.currentMedications.join(" ") ?? "",
      ),
    );
  }, [patients, deferredQuery]);

  return (
    <main className="doctor-dashboard">
      <section className="doctor-hero doctor-hero-compact">
        <div>
          <span className="doctor-kicker">Painel do medico</span>
          <h1>Buscar paciente e abrir prontuario</h1>
          <p className="muted">Pesquise por qualquer termo disponivel do paciente e siga direto para o prontuario.</p>
        </div>
      </section>

      <section className="doctor-search card">
        <div className="doctor-search-heading">
          <div>
            <h2>Buscar paciente</h2>
            <p className="muted">Nome, CPF, usuario, nascimento, alergias, condicoes ou medicamentos em uso.</p>
          </div>
          <span className="doctor-result-chip">{filteredPatients.length} paciente(s)</span>
        </div>

        <div className="doctor-facts-grid">
          <article className="doctor-fact-card">
            <span className="doctor-fact-label">Busca livre</span>
            <strong>Nome, CPF e contexto clinico</strong>
            <small>Localize o prontuario usando qualquer dado ja salvo</small>
          </article>
          <article className="doctor-fact-card">
            <span className="doctor-fact-label">Resultado atual</span>
            <strong>{filteredPatients.length}</strong>
            <small>Filtro aplicado sem travar a digitacao</small>
          </article>
        </div>

        <label htmlFor="doctor-dashboard-search" className="sr-only">
          Buscar paciente
        </label>
        <input
          id="doctor-dashboard-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex.: Maria, 123.456.789-00, user_, dipirona, hipertensao, 1990"
          className="doctor-search-input"
        />

        {loading && <p>Carregando pacientes...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <div className="doctor-patient-list">
            {filteredPatients.map((patient) => (
              <article key={patient.id} className="doctor-patient-row">
                <div className="doctor-patient-row-main">
                  <strong>{patient.name?.trim() || patient.userId}</strong>
                  <p className="muted">
                    Usuario: {patient.userId}
                    {patient.cpf ? ` · CPF ${formatCpf(patient.cpf)}` : ""}
                  </p>
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
