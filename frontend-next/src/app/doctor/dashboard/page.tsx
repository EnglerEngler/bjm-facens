"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import type { Patient } from "@/types/domain";

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

  const filtered = useMemo(() => {
    if (!query.trim()) return patients;
    const text = query.trim().toLowerCase();
    return patients.filter((patient) => patient.id.toLowerCase().includes(text) || patient.userId.toLowerCase().includes(text));
  }, [patients, query]);

  const criticalPatients = patients.filter((item) => (item.record?.allergies.length ?? 0) > 0).length;

  return (
    <main>
      <h1>Dashboard Médico</h1>
      <div className="grid grid-2">
        <section className="card">
          <h3>Pacientes vinculados</h3>
          <strong>{patients.length}</strong>
        </section>
        <section className="card">
          <h3>Com alergias registradas</h3>
          <strong>{criticalPatients}</strong>
        </section>
      </div>

      <section className="card">
        <h3>Busca de prontuário</h3>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por ID do paciente ou usuário" />
        {loading && <p>Carregando pacientes...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && (
          <div className="grid" style={{ marginTop: 12 }}>
            {filtered.map((patient) => (
              <article key={patient.id} className="card">
                <div className="between">
                  <div>
                    <strong>{patient.id}</strong>
                    <p className="muted">Usuário: {patient.userId}</p>
                  </div>
                  <div className="row">
                    <Link href={`/doctor/patients/${patient.id}`}>Abrir prontuário</Link>
                    <Link href={`/doctor/prescriptions/new?patientId=${patient.id}`}>Nova prescrição</Link>
                  </div>
                </div>
              </article>
            ))}
            {filtered.length === 0 && <p className="muted">Nenhum paciente encontrado.</p>}
          </div>
        )}
      </section>
    </main>
  );
}
