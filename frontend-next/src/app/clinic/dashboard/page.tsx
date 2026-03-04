"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import type { AdminDashboardClinic } from "@/types/domain";

export default function ClinicDashboardPage() {
  useAuthRedirect();

  const [clinics, setClinics] = useState<AdminDashboardClinic[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const payload = await apiRequest<AdminDashboardClinic[]>("/admin/dashboard");
        setClinics(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar dashboard da clinica.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const filteredClinics = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return clinics;

    return clinics
      .map((clinic) => {
        const doctors = clinic.doctors.filter((doctor) =>
          [doctor.name, doctor.email, doctor.userId, doctor.id].some((value) => value.toLowerCase().includes(text)),
        );
        const patients = clinic.patients.filter((patient) =>
          [patient.name, patient.email, patient.userId, patient.id, patient.birthDate ?? ""].some((value) =>
            value.toLowerCase().includes(text),
          ),
        );
        const clinicMatch = [clinic.clinicName, clinic.joinCode, clinic.clinicId].some((value) =>
          value.toLowerCase().includes(text),
        );

        if (clinicMatch) return clinic;
        if (doctors.length || patients.length) return { ...clinic, doctors, patients };
        return null;
      })
      .filter((item): item is AdminDashboardClinic => item !== null);
  }, [clinics, query]);

  const totals = useMemo(
    () => ({
      clinics: clinics.length,
      doctors: clinics.reduce((acc, item) => acc + item.doctors.length, 0),
      patients: clinics.reduce((acc, item) => acc + item.patients.length, 0),
    }),
    [clinics],
  );

  return (
    <main>
      <h1>Dashboard da Clínica</h1>
      <p className="muted">Visão restrita aos dados da sua clínica.</p>

      <section className="grid grid-2">
        <article className="card">
          <p className="muted">Clinicas</p>
          <strong>{totals.clinics}</strong>
        </article>
        <article className="card">
          <p className="muted">Medicos</p>
          <strong>{totals.doctors}</strong>
        </article>
        <article className="card">
          <p className="muted">Pacientes</p>
          <strong>{totals.patients}</strong>
        </article>
      </section>

      <section className="card">
        <label htmlFor="clinic-search">Pesquisar medico ou paciente</label>
        <input
          id="clinic-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex.: maria@, patient_..."
        />
      </section>

      {loading && <p>Carregando dashboard...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && filteredClinics.length === 0 && <p>Nenhum resultado para a busca atual.</p>}

      {!loading &&
        !error &&
        filteredClinics.map((clinic) => (
          <section key={clinic.clinicId} className="card">
            <div className="between">
              <h2>{clinic.clinicName}</h2>
              <span className="muted">Codigo: {clinic.joinCode}</span>
            </div>
            <p className="muted">ID da clinica: {clinic.clinicId}</p>

            <h3>Medicos ({clinic.doctors.length})</h3>
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>User ID</th>
                  <th>Perfil ID</th>
                </tr>
              </thead>
              <tbody>
                {clinic.doctors.map((doctor) => (
                  <tr key={doctor.id}>
                    <td>{doctor.name}</td>
                    <td>{doctor.email}</td>
                    <td>{doctor.userId}</td>
                    <td>{doctor.id}</td>
                  </tr>
                ))}
                {clinic.doctors.length === 0 && (
                  <tr>
                    <td colSpan={4}>Nenhum medico cadastrado nesta clinica.</td>
                  </tr>
                )}
              </tbody>
            </table>

            <h3>Pacientes ({clinic.patients.length})</h3>
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>User ID</th>
                  <th>Perfil ID</th>
                  <th>Nascimento</th>
                </tr>
              </thead>
              <tbody>
                {clinic.patients.map((patient) => (
                  <tr key={patient.id}>
                    <td>{patient.name}</td>
                    <td>{patient.email}</td>
                    <td>{patient.userId}</td>
                    <td>{patient.id}</td>
                    <td>{patient.birthDate ?? "-"}</td>
                  </tr>
                ))}
                {clinic.patients.length === 0 && (
                  <tr>
                    <td colSpan={5}>Nenhum paciente cadastrado nesta clinica.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        ))}
    </main>
  );
}
