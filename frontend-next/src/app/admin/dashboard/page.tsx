"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import type { AdminDashboardClinic, ClinicManagedUser } from "@/types/domain";

type ManagedAdminUser = ClinicManagedUser & {
  clinicId: string;
  clinicName: string;
  joinCode: string;
};

const formatDate = (value?: string | null) => {
  if (!value) return "Nascimento pendente";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
};

export default function AdminDashboardPage() {
  useAuthRedirect();

  const [clinics, setClinics] = useState<AdminDashboardClinic[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", password: "", birthDate: "" });

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const payload = await apiRequest<AdminDashboardClinic[]>("/admin/dashboard");
        setClinics(payload);
        const firstUser = payload.flatMap((clinic) => [
          ...clinic.doctors.map((doctor) => doctor.userId),
          ...clinic.patients.map((patient) => patient.userId),
        ])[0];
        setSelectedUserId(firstUser ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar dashboard administrativo.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const users = useMemo<ManagedAdminUser[]>(
    () =>
      clinics.flatMap((clinic) => [
        ...clinic.doctors.map((doctor) => ({
          ...doctor,
          birthDate: null,
          clinicId: clinic.clinicId,
          clinicName: clinic.clinicName,
          joinCode: clinic.joinCode,
        })),
        ...clinic.patients.map((patient) => ({
          ...patient,
          clinicId: clinic.clinicId,
          clinicName: clinic.clinicName,
          joinCode: clinic.joinCode,
        })),
      ]),
    [clinics],
  );

  const filteredUsers = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return users;

    return users.filter((user) =>
      [user.name, user.email, user.userId, user.id, user.birthDate ?? "", user.role, user.clinicName, user.joinCode, user.clinicId].some(
        (value) => value.toLowerCase().includes(text),
      ),
    );
  }, [users, query]);

  const selectedUser = users.find((user) => user.userId === selectedUserId) ?? null;

  useEffect(() => {
    if (!selectedUser) {
      setEditForm({ name: "", email: "", password: "", birthDate: "" });
      return;
    }

    setEditForm({
      name: selectedUser.name,
      email: selectedUser.email,
      password: "",
      birthDate: selectedUser.birthDate ?? "",
    });
  }, [selectedUser]);

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

  const upsertManagedUser = (nextUser: ClinicManagedUser, clinicId: string) => {
    setClinics((current) =>
      current.map((clinic) => {
        if (clinic.clinicId !== clinicId) return clinic;

        const doctors = clinic.doctors.filter((doctor) => doctor.userId !== nextUser.userId);
        const patients = clinic.patients.filter((patient) => patient.userId !== nextUser.userId);

        if (nextUser.role === "doctor") {
          doctors.unshift({
            id: nextUser.id,
            userId: nextUser.userId,
            name: nextUser.name,
            email: nextUser.email,
            role: "doctor",
          });
        } else {
          patients.unshift({
            id: nextUser.id,
            userId: nextUser.userId,
            name: nextUser.name,
            email: nextUser.email,
            role: "patient",
            birthDate: nextUser.birthDate,
          });
        }

        return { ...clinic, doctors, patients };
      }),
    );
  };

  const handleUpdateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUser) return;

    setEditError(null);
    setFeedback(null);

    try {
      setSaving(true);
      const updated = await apiRequest<ClinicManagedUser>(`/admin/users/${selectedUser.userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          password: editForm.password || undefined,
          birthDate: selectedUser.role === "patient" ? editForm.birthDate || null : undefined,
          clinicId: selectedUser.clinicId,
        }),
      });

      upsertManagedUser(updated, selectedUser.clinicId);
      setEditForm((current) => ({ ...current, password: "" }));
      setFeedback("Perfil atualizado com sucesso.");
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Falha ao atualizar perfil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="doctor-dashboard admin-dashboard">
      <section className="doctor-hero admin-dashboard-hero">
        <div>
          <span className="doctor-kicker">Painel administrativo</span>
          <h1>Visao consolidada da operacao clinica</h1>
          <p className="muted">
            Acompanhe clinicas, equipes medicas e pacientes em um painel unificado, com a mesma leitura clara dos outros dashboards.
          </p>
        </div>
        <div className="doctor-hero-meta">
          <span>{totals.clinics} clinica(s) no ecossistema</span>
          <span>{totals.doctors + totals.patients} pessoas vinculadas</span>
          <span>{filteredClinics.length} clinica(s) visiveis na busca</span>
        </div>
      </section>

      <section className="doctor-search card">
        <div className="doctor-search-heading">
          <div>
            <h2>Rede assistencial</h2>
            <p className="muted">Pesquise por clinica, codigo de entrada, nome, e-mail, perfil, usuario ou data de nascimento.</p>
          </div>
          <span className="doctor-result-chip">{filteredClinics.length} resultado(s)</span>
        </div>

        <div className="doctor-facts-grid admin-summary-grid">
          <article className="doctor-fact-card">
            <span className="doctor-fact-label">Clinicas</span>
            <strong>{totals.clinics}</strong>
            <small>Unidades cadastradas no sistema</small>
          </article>
          <article className="doctor-fact-card">
            <span className="doctor-fact-label">Medicos</span>
            <strong>{totals.doctors}</strong>
            <small>Perfis de atendimento ativos</small>
          </article>
          <article className="doctor-fact-card">
            <span className="doctor-fact-label">Pacientes</span>
            <strong>{totals.patients}</strong>
            <small>Cadastros acompanhados pelas clinicas</small>
          </article>
        </div>

        <label htmlFor="admin-search" className="sr-only">
          Pesquisar clinica, medico ou paciente
        </label>
        <input
          id="admin-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex.: Clinica Central, maria@, patient_, 1990-08-16"
          className="doctor-search-input"
        />

        {loading && <p>Carregando dashboard...</p>}
        {error && <p className="error">{error}</p>}
        {feedback && <p className="success">{feedback}</p>}

        {!loading && !error && (
          <div className="doctor-search-results">
            {filteredUsers.map((user) => {
              const active = user.userId === selectedUserId;
              return (
                <button
                  key={user.userId}
                  type="button"
                  className={`doctor-patient-card${active ? " doctor-patient-card-active" : ""}`}
                  onClick={() => setSelectedUserId(user.userId)}
                >
                  <span className="doctor-patient-card-top">
                    <strong>{user.name}</strong>
                    <span>{user.role === "doctor" ? "Medico" : formatDate(user.birthDate)}</span>
                  </span>
                  <span className="muted">{user.email}</span>
                  <span className="doctor-patient-card-meta">
                    {user.role === "doctor" ? "Perfil medico" : "Perfil paciente"} · {user.clinicName}
                  </span>
                </button>
              );
            })}
            {filteredUsers.length === 0 && <p className="muted">Nenhum perfil encontrado para a busca atual.</p>}
          </div>
        )}

        {!loading && !error && filteredClinics.length === 0 && (
          <div className="patient-dashboard-empty-state admin-dashboard-empty-state">
            <div>
              <strong>Nenhum resultado para a busca atual</strong>
              <p className="muted">Tente outro nome, identificador, e-mail ou codigo de clinica para refinar a consulta.</p>
            </div>
          </div>
        )}
      </section>

      <section className="doctor-record-shell">
        <div className="doctor-record-main admin-management-grid">
          <section className="admin-editor-card">
            <div className="doctor-record-header">
              <div>
                <span className="doctor-section-label">Edicao</span>
                <h2>{selectedUser ? `Editar ${selectedUser.name}` : "Selecione um perfil"}</h2>
                <p className="muted">Atualize dados cadastrais diretamente do painel administrativo global.</p>
              </div>
            </div>

            {!selectedUser && (
              <section className="card doctor-record-card">
                <div className="patient-dashboard-empty-state admin-dashboard-empty-state">
                  <div>
                    <strong>Escolha um medico ou paciente</strong>
                    <p className="muted">Clique em um card acima ou em uma linha da clinica para abrir o painel de edicao.</p>
                  </div>
                </div>
              </section>
            )}

            {selectedUser && (
              <form className="patient-onboarding-form" onSubmit={handleUpdateUser}>
                <section className="card doctor-record-card">
                  <div className="doctor-record-header">
                    <div>
                      <span className="doctor-section-label">Conta</span>
                      <h2>Nome e e-mail</h2>
                      <p className="muted">Esses dados identificam o usuario no acesso e nos paines internos.</p>
                    </div>
                  </div>

                  <section className="doctor-anamnesis-card">
                    <div className="patient-onboarding-grid">
                      <label>
                        Nome
                        <input
                          value={editForm.name}
                          onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                          required
                        />
                      </label>

                      <label>
                        E-mail
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
                          required
                        />
                      </label>
                    </div>
                  </section>
                </section>

                <section className="card doctor-record-card">
                  <div className="doctor-record-header">
                    <div>
                      <span className="doctor-section-label">Perfil</span>
                      <h2>Dados do usuario selecionado</h2>
                      <p className="muted">O admin consegue ajustar acesso e, quando for paciente, o nascimento.</p>
                    </div>
                  </div>

                  <section className="doctor-anamnesis-card">
                    <h3>Metadados</h3>
                    <div className="doctor-facts-grid">
                      <article className="doctor-fact-card">
                        <span className="doctor-fact-label">Tipo de perfil</span>
                        <strong>{selectedUser.role === "doctor" ? "Medico" : "Paciente"}</strong>
                        <small>Profile ID {selectedUser.id}</small>
                      </article>
                      <article className="doctor-fact-card">
                        <span className="doctor-fact-label">Usuario</span>
                        <strong>{selectedUser.userId}</strong>
                        <small>{selectedUser.email}</small>
                      </article>
                      <article className="doctor-fact-card">
                        <span className="doctor-fact-label">Clinica</span>
                        <strong>{selectedUser.clinicName}</strong>
                        <small>Codigo {selectedUser.joinCode}</small>
                      </article>
                    </div>
                  </section>

                  <section className="doctor-anamnesis-card">
                    <h3>Acesso</h3>
                    <div className="patient-onboarding-grid">
                      {selectedUser.role === "patient" && (
                        <label>
                          Nascimento
                          <input
                            type="date"
                            value={editForm.birthDate}
                            onChange={(event) => setEditForm((current) => ({ ...current, birthDate: event.target.value }))}
                          />
                        </label>
                      )}

                      <label>
                        Nova senha
                        <input
                          type="password"
                          value={editForm.password}
                          onChange={(event) => setEditForm((current) => ({ ...current, password: event.target.value }))}
                          placeholder="Preencha apenas se quiser redefinir"
                        />
                      </label>
                    </div>
                  </section>

                  <div className="patient-onboarding-actions patient-profile-actions">
                    <button type="submit" className="doctor-action-button doctor-action-button-primary" disabled={saving}>
                      {saving ? "Salvando..." : "Salvar perfil"}
                    </button>
                  </div>

                  {editError && <p className="error">{editError}</p>}
                </section>
              </form>
            )}
          </section>
        </div>
      </section>

      {!loading &&
        !error &&
        filteredClinics.map((clinic) => (
          <section key={clinic.clinicId} className="card doctor-record-card admin-clinic-section">
            <div className="doctor-record-header">
              <div>
                <span className="doctor-section-label">Clinica</span>
                <h2>{clinic.clinicName}</h2>
                <p className="muted">ID da clinica: {clinic.clinicId}</p>
              </div>
              <div className="doctor-hero-meta admin-clinic-meta">
                <span>Codigo {clinic.joinCode}</span>
                <span>{clinic.doctors.length} medico(s)</span>
                <span>{clinic.patients.length} paciente(s)</span>
              </div>
            </div>

            <div className="doctor-facts-grid admin-clinic-overview">
              <article className="doctor-fact-card">
                <span className="doctor-fact-label">Equipe medica</span>
                <strong>{clinic.doctors.length}</strong>
                <small>Profissionais vinculados a esta clinica</small>
              </article>
              <article className="doctor-fact-card">
                <span className="doctor-fact-label">Base de pacientes</span>
                <strong>{clinic.patients.length}</strong>
                <small>Pessoas acompanhadas nesta operacao</small>
              </article>
            </div>

            <div className="admin-clinic-grid">
              <section className="admin-clinic-panel">
                <div className="doctor-record-header">
                  <div>
                    <span className="doctor-section-label">Medicos</span>
                    <h3>Equipe assistencial</h3>
                  </div>
                </div>

                {clinic.doctors.length === 0 ? (
                  <div className="patient-dashboard-empty-state admin-dashboard-empty-state">
                    <div>
                      <strong>Nenhum medico cadastrado</strong>
                      <p className="muted">Esta clinica ainda nao possui perfis medicos vinculados.</p>
                    </div>
                  </div>
                ) : (
                  <div className="doctor-patient-list">
                    {clinic.doctors.map((doctor) => (
                      <button
                        key={doctor.id}
                        type="button"
                        className={`doctor-patient-row admin-selectable-row${doctor.userId === selectedUserId ? " doctor-patient-card-active" : ""}`}
                        onClick={() => setSelectedUserId(doctor.userId)}
                      >
                        <div className="doctor-patient-row-main">
                          <strong>{doctor.name}</strong>
                          <p className="muted">{doctor.email}</p>
                        </div>
                        <div className="doctor-patient-row-tags">
                          <span>Perfil medico</span>
                          <span>User {doctor.userId}</span>
                          <span>ID {doctor.id}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="admin-clinic-panel">
                <div className="doctor-record-header">
                  <div>
                    <span className="doctor-section-label">Pacientes</span>
                    <h3>Base acompanhada</h3>
                  </div>
                </div>

                {clinic.patients.length === 0 ? (
                  <div className="patient-dashboard-empty-state admin-dashboard-empty-state">
                    <div>
                      <strong>Nenhum paciente cadastrado</strong>
                      <p className="muted">Ainda nao ha perfis de pacientes associados a esta clinica.</p>
                    </div>
                  </div>
                ) : (
                  <div className="doctor-patient-list">
                    {clinic.patients.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        className={`doctor-patient-row admin-selectable-row${patient.userId === selectedUserId ? " doctor-patient-card-active" : ""}`}
                        onClick={() => setSelectedUserId(patient.userId)}
                      >
                        <div className="doctor-patient-row-main">
                          <strong>{patient.name}</strong>
                          <p className="muted">{patient.email}</p>
                        </div>
                        <div className="doctor-patient-row-tags">
                          <span>{formatDate(patient.birthDate)}</span>
                          <span>User {patient.userId}</span>
                          <span>ID {patient.id}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </section>
        ))}
    </main>
  );
}
