"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { pushFlashToast } from "@/lib/flash-toast";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { digitsOnly, formatCpf, matchesSearch } from "@/lib/patient-fields";
import type { AdminDashboardClinic, ClinicManagedUser } from "@/types/domain";

type ManagedClinicUser = ClinicManagedUser & {
  clinicId: string;
  clinicName: string;
  joinCode: string;
};

type CreateUserForm = {
  name: string;
  email: string;
  password: string;
  role: "doctor" | "patient";
  cpf: string;
  birthDate: string;
};

const formatDate = (value?: string | null) => {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
};

const emptyCreateForm: CreateUserForm = {
  name: "",
  email: "",
  password: "",
  role: "doctor",
  cpf: "",
  birthDate: "",
};

export default function ClinicDashboardPage() {
  useAuthRedirect();

  const [clinics, setClinics] = useState<AdminDashboardClinic[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>(emptyCreateForm);
  const [editForm, setEditForm] = useState({ name: "", email: "", password: "", cpf: "", birthDate: "" });

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const payload = await apiRequest<AdminDashboardClinic[]>("/admin/dashboard");
        setClinics(payload);
        const firstUser = payload.flatMap((clinic) => [
          ...clinic.doctors.map((doctor) => doctor.userId),
          ...clinic.patients.map((patient) => patient.userId),
        ])[0];
        setSelectedUserId(firstUser ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar dashboard da clínica.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const clinic = clinics[0] ?? null;

  const users = useMemo<ManagedClinicUser[]>(() => {
    return clinics.flatMap((clinicItem) => [
      ...clinicItem.doctors.map((doctor) => ({
        ...doctor,
        cpf: null,
        birthDate: null,
        clinicId: clinicItem.clinicId,
        clinicName: clinicItem.clinicName,
        joinCode: clinicItem.joinCode,
      })),
      ...clinicItem.patients.map((patient) => ({
        ...patient,
        clinicId: clinicItem.clinicId,
        clinicName: clinicItem.clinicName,
        joinCode: clinicItem.joinCode,
      })),
    ]);
  }, [clinics]);

  const filteredUsers = useMemo(() => {
    if (!query.trim()) return users;

    return users.filter((user) =>
      matchesSearch(query, user.name, user.email, user.userId, user.id, user.cpf ?? "", user.birthDate ?? "", user.role, user.clinicName, user.joinCode),
    );
  }, [users, query]);

  const totals = useMemo(
    () => ({
      clinics: clinics.length,
      doctors: clinics.reduce((acc, item) => acc + item.doctors.length, 0),
      patients: clinics.reduce((acc, item) => acc + item.patients.length, 0),
    }),
    [clinics],
  );

  const selectedUser = users.find((user) => user.userId === selectedUserId) ?? null;

  useEffect(() => {
    if (!selectedUser) {
      setEditForm({ name: "", email: "", password: "", cpf: "", birthDate: "" });
      return;
    }

    setEditForm({
      name: selectedUser.name,
      email: selectedUser.email,
      password: "",
      cpf: selectedUser.cpf ? formatCpf(selectedUser.cpf) : "",
      birthDate: selectedUser.birthDate ?? "",
    });
  }, [selectedUser]);

  const upsertManagedUser = (nextUser: ClinicManagedUser, clinicId?: string) => {
    setClinics((current) =>
      current.map((clinicItem) => {
        if (clinicId && clinicItem.clinicId !== clinicId) return clinicItem;

        const doctors = clinicItem.doctors.filter((doctor) => doctor.userId !== nextUser.userId);
        const patients = clinicItem.patients.filter((patient) => patient.userId !== nextUser.userId);

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
            cpf: nextUser.cpf,
            birthDate: nextUser.birthDate,
          });
        }

        return { ...clinicItem, doctors, patients };
      }),
    );
  };

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);
    setFeedback(null);

    try {
      setCreating(true);
      const created = await apiRequest<ClinicManagedUser>("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: createForm.name,
          email: createForm.email,
          password: createForm.password,
          role: createForm.role,
          cpf: createForm.role === "patient" ? digitsOnly(createForm.cpf) || null : undefined,
          birthDate: createForm.role === "patient" ? createForm.birthDate || null : undefined,
        }),
      });

      upsertManagedUser(created, clinic?.clinicId);
      setCreateForm(emptyCreateForm);
      setSelectedUserId(created.userId);
      setFeedback(`${created.role === "doctor" ? "Médico" : "Paciente"} cadastrado com sucesso.`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Falha ao cadastrar usuário.");
    } finally {
      setCreating(false);
    }
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
          cpf: selectedUser.role === "patient" ? digitsOnly(editForm.cpf) || null : undefined,
          birthDate: selectedUser.role === "patient" ? editForm.birthDate || null : undefined,
        }),
      });

      upsertManagedUser(updated, selectedUser.clinicId);
      setEditForm((current) => ({ ...current, password: "" }));
      setFeedback("Usuário atualizado com sucesso.");
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Falha ao atualizar usuário.");
    } finally {
      setSaving(false);
    }
  };

  const copyClinicJoinCode = async () => {
    if (!clinic?.joinCode) return;

    try {
      await navigator.clipboard.writeText(clinic.joinCode);
      pushFlashToast("Código de entrada copiado.");
    } catch {
      setFeedback("Não foi possível copiar o código de entrada.");
    }
  };

  return (
    <main className="doctor-dashboard clinic-dashboard">
      <section className="doctor-hero clinic-hero">
        <div>
          <span className="doctor-kicker">Painel da clínica</span>
          <h1>Gestão de usuários da sua operação clínica</h1>
          <p className="muted">
            Cadastre novos médicos e pacientes, revise os dados existentes e mantenha o acesso restrito à sua clínica.
          </p>
        </div>
        <div className="clinic-dashboard-code">
          <span>Código de entrada: {clinic?.joinCode ?? "-"}</span>
          {clinic ? (
            <button type="button" className="clinic-dashboard-copy-button" onClick={copyClinicJoinCode} aria-label="Copiar código de entrada">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M9 9a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6 15H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : null}
        </div>
      </section>

      <section className="doctor-search card">
        <div className="doctor-search-heading">
          <div>
            <h2>Equipe e pacientes</h2>
            <p className="muted">Pesquise por nome, e-mail, role, CPF, identificadores ou nascimento.</p>
          </div>
        </div>

        <div className="doctor-facts-grid clinic-summary-grid">
          <article className="doctor-fact-card">
            <span className="doctor-fact-label">Clínicas visíveis</span>
            <strong>{totals.clinics}</strong>
            <small>Escopo atual do admin da clínica</small>
          </article>
          <article className="doctor-fact-card">
            <span className="doctor-fact-label">Médicos</span>
            <strong>{totals.doctors}</strong>
            <small>Perfis de prescritores cadastrados</small>
          </article>
          <article className="doctor-fact-card">
            <span className="doctor-fact-label">Pacientes</span>
            <strong>{totals.patients}</strong>
            <small>Usuários acompanhados pela clínica</small>
          </article>
        </div>

        <label htmlFor="clinic-dashboard-search" className="sr-only">
          Buscar usuários
        </label>
        <input
          id="clinic-dashboard-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex.: maria@clinica.com, 123.456.789-00, patient_, doctor, 1990-08-16"
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
                    <span>{user.role === "doctor" ? "Médico" : formatDate(user.birthDate)}</span>
                  </span>
                  <span className="muted">{user.email}</span>
                  <span className="doctor-patient-card-meta">
                    {user.role === "doctor" ? "Perfil médico" : `Perfil paciente · CPF ${user.cpf ? formatCpf(user.cpf) : "pendente"}`} · User {user.userId}
                  </span>
                </button>
              );
            })}
            {filteredUsers.length === 0 && <p className="muted">Nenhum usuário encontrado para a busca atual.</p>}
          </div>
        )}
      </section>

      <section className="doctor-record-shell">
        <div className="doctor-record-main clinic-management-grid">
          <section className="card doctor-record-card">
            <div className="doctor-record-header">
              <div>
                <span className="doctor-section-label">Cadastro</span>
                <h2>Adicionar usuário</h2>
                <p className="muted">Crie um novo médico ou paciente diretamente na sua clínica.</p>
              </div>
            </div>

            <form className="clinic-user-form" onSubmit={handleCreateUser}>
              <label>
                Nome
                <input
                  value={createForm.name}
                  onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>

              <label>
                E-mail
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>

              <label>
                Senha inicial
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
                />
              </label>

              <label>
                Perfil
                <select
                  value={createForm.role}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      role: event.target.value as "doctor" | "patient",
                      cpf: event.target.value === "patient" ? current.cpf : "",
                      birthDate: event.target.value === "patient" ? current.birthDate : "",
                    }))
                  }
                >
                  <option value="doctor">Médico</option>
                  <option value="patient">Paciente</option>
                </select>
              </label>

              {createForm.role === "patient" && (
                <>
                  <label>
                    CPF
                    <input
                      value={createForm.cpf}
                      onChange={(event) => setCreateForm((current) => ({ ...current, cpf: formatCpf(event.target.value) }))}
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                      maxLength={14}
                    />
                  </label>
                  <label>
                    Nascimento
                    <input
                      type="date"
                      value={createForm.birthDate}
                      onChange={(event) => setCreateForm((current) => ({ ...current, birthDate: event.target.value }))}
                    />
                  </label>
                </>
              )}

              <button type="submit" className="doctor-action-button doctor-action-button-primary" disabled={creating}>
                {creating ? "Cadastrando..." : "Adicionar usuário"}
              </button>

              {createError && <p className="error">{createError}</p>}
            </form>
          </section>

          <section className="card doctor-record-card">
            <div className="doctor-record-header">
              <div>
                <span className="doctor-section-label">Edição</span>
                <h2>{selectedUser ? `Editar ${selectedUser.name}` : "Selecione um usuário"}</h2>
                <p className="muted">Atualize dados cadastrais e redefina a senha quando necessário.</p>
              </div>
            </div>

            {!selectedUser && <p className="muted">Escolha um usuário na lista acima para editar.</p>}

            {selectedUser && (
              <>
                <div className="doctor-facts-grid">
                  <article className="doctor-fact-card">
                    <span className="doctor-fact-label">Perfil</span>
                    <strong>{selectedUser.role === "doctor" ? "Médico" : "Paciente"}</strong>
                    <small>Profile ID {selectedUser.id}</small>
                  </article>
                  <article className="doctor-fact-card">
                    <span className="doctor-fact-label">Usuário</span>
                    <strong>{selectedUser.userId}</strong>
                    <small>{selectedUser.email}</small>
                  </article>
                  <article className="doctor-fact-card">
                    <span className="doctor-fact-label">Clínica</span>
                    <strong>{selectedUser.clinicName}</strong>
                    <small>Código {selectedUser.joinCode}</small>
                  </article>
                </div>

                <form className="clinic-user-form" onSubmit={handleUpdateUser}>
                  <label>
                    Nome
                    <input
                      value={editForm.name}
                      onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                    />
                  </label>

                  <label>
                    E-mail
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
                    />
                  </label>

                  {selectedUser.role === "patient" && (
                    <>
                      <label>
                        CPF
                        <input
                          value={editForm.cpf}
                          onChange={(event) => setEditForm((current) => ({ ...current, cpf: formatCpf(event.target.value) }))}
                          placeholder="000.000.000-00"
                          inputMode="numeric"
                          maxLength={14}
                        />
                      </label>
                      <label>
                        Nascimento
                        <input
                          type="date"
                          value={editForm.birthDate}
                          onChange={(event) => setEditForm((current) => ({ ...current, birthDate: event.target.value }))}
                        />
                      </label>
                    </>
                  )}

                  <label>
                    Nova senha
                    <input
                      type="password"
                      value={editForm.password}
                      onChange={(event) => setEditForm((current) => ({ ...current, password: event.target.value }))}
                      placeholder="Preencha apenas se quiser alterar"
                    />
                  </label>

                  <button type="submit" className="doctor-action-button doctor-action-button-secondary" disabled={saving}>
                    {saving ? "Salvando..." : "Salvar alterações"}
                  </button>

                  {editError && <p className="error">{editError}</p>}
                </form>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
