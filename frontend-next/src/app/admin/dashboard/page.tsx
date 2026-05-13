"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { digitsOnly, formatCep, formatCpf, formatPhone, matchesSearch } from "@/lib/patient-fields";
import type { AdminDashboardClinic, AdminManagedUserDetail, ClinicManagedUser } from "@/types/domain";

type ManagedAdminUser = ClinicManagedUser & {
  clinicId: string;
  clinicName: string;
  joinCode: string;
};

type AdminEntityFilter = "clinics" | "doctors" | "patients" | null;

type CreateAdminUserFormState = {
  clinicId: string;
  name: string;
  email: string;
  password: string;
  role: "doctor" | "patient" | "clinic_admin";
  cpf: string;
  birthDate: string;
};

type CreateClinicFormState = {
  clinicName: string;
  cnpj: string;
};

type PatientProfileFormState = {
  cpf: string;
  birthDate: string;
  biologicalSex: "masculino" | "feminino" | "";
  phone: string;
  addressZipCode: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

type AdminEditFormState = {
  name: string;
  email: string;
  password: string;
} & PatientProfileFormState;

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

const emptyEditForm: AdminEditFormState = {
  name: "",
  email: "",
  password: "",
  cpf: "",
  birthDate: "",
  biologicalSex: "",
  phone: "",
  addressZipCode: "",
  addressStreet: "",
  addressNumber: "",
  addressComplement: "",
  addressNeighborhood: "",
  addressCity: "",
  addressState: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

const emptyCreateForm: CreateAdminUserFormState = {
  clinicId: "",
  name: "",
  email: "",
  password: "",
  role: "doctor",
  cpf: "",
  birthDate: "",
};

const emptyCreateClinicForm: CreateClinicFormState = {
  clinicName: "",
  cnpj: "",
};

const toEditFormState = (user: AdminManagedUserDetail): AdminEditFormState => ({
  name: user.name,
  email: user.email,
  password: "",
  cpf: user.cpf ? formatCpf(user.cpf) : "",
  birthDate: user.birthDate ?? "",
  biologicalSex: user.biologicalSex ?? "",
  phone: user.phone ? formatPhone(user.phone) : "",
  addressZipCode: user.addressZipCode ? formatCep(user.addressZipCode) : "",
  addressStreet: user.addressStreet ?? "",
  addressNumber: user.addressNumber ?? "",
  addressComplement: user.addressComplement ?? "",
  addressNeighborhood: user.addressNeighborhood ?? "",
  addressCity: user.addressCity ?? "",
  addressState: user.addressState ?? "",
  emergencyContactName: user.emergencyContactName ?? "",
  emergencyContactPhone: user.emergencyContactPhone ? formatPhone(user.emergencyContactPhone) : "",
});

const formatDate = (value?: string | null) => {
  if (!value) return "Nascimento pendente";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
};

export default function AdminDashboardPage() {
  useAuthRedirect();

  const [clinics, setClinics] = useState<AdminDashboardClinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<AdminEntityFilter>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSelectedUser, setLoadingSelectedUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createClinicError, setCreateClinicError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [creatingClinic, setCreatingClinic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clinicSearch, setClinicSearch] = useState("");
  const [isCreateClinicModalOpen, setIsCreateClinicModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState<AdminManagedUserDetail | null>(null);
  const [editForm, setEditForm] = useState<AdminEditFormState>(emptyEditForm);
  const [createForm, setCreateForm] = useState<CreateAdminUserFormState>(emptyCreateForm);
  const [createClinicForm, setCreateClinicForm] = useState<CreateClinicFormState>(emptyCreateClinicForm);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const payload = await apiRequest<AdminDashboardClinic[]>("/admin/dashboard");
        setClinics(payload);
        setCreateForm((current) => ({
          ...current,
          clinicId: current.clinicId || payload[0]?.clinicId || "",
        }));
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
          cpf: null,
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
        ...clinic.clinicAdmins.map((clinicAdmin) => ({
          ...clinicAdmin,
          cpf: null,
          birthDate: null,
          clinicId: clinic.clinicId,
          clinicName: clinic.clinicName,
          joinCode: clinic.joinCode,
        })),
      ]),
    [clinics],
  );

  const filteredUsers = useMemo(() => {
    const scopedUsers =
      activeFilter === "clinics"
        ? []
        : users.filter((user) => {
            if (activeFilter === "doctors") return user.role === "doctor";
            if (activeFilter === "patients") return user.role === "patient";
            return true;
          });

    if (!query.trim()) return scopedUsers;

    return scopedUsers.filter((user) =>
      matchesSearch(
        query,
        user.name,
        user.email,
        user.userId,
        user.id,
        user.cpf ?? "",
        user.birthDate ?? "",
        user.role,
        user.clinicName,
        user.joinCode,
        user.clinicId,
      ),
    );
  }, [activeFilter, users, query]);

  const selectedUserSummary = users.find((user) => user.userId === selectedUserId) ?? null;
  const selectedUser = selectedUserDetail ?? selectedUserSummary;

  useEffect(() => {
    if (!selectedUserSummary) {
      setSelectedUserDetail(null);
      setEditForm(emptyEditForm);
      return;
    }

    const run = async () => {
      try {
        setLoadingSelectedUser(true);
        setEditError(null);
        setSelectedUserDetail(null);
        const detail = await apiRequest<AdminManagedUserDetail>(
          `/admin/users/${selectedUserSummary.userId}?clinicId=${encodeURIComponent(selectedUserSummary.clinicId)}`,
        );
        const nextDetail = {
          ...detail,
          clinicId: selectedUserSummary.clinicId,
          clinicName: selectedUserSummary.clinicName,
          joinCode: selectedUserSummary.joinCode,
        };
        setSelectedUserDetail(nextDetail);
        setEditForm(toEditFormState(nextDetail));
      } catch (err) {
        setEditError(err instanceof Error ? err.message : "Falha ao carregar os dados completos do perfil.");
        setSelectedUserDetail(null);
        setEditForm(toEditFormState(selectedUserSummary));
      } finally {
        setLoadingSelectedUser(false);
      }
    };

    void run();
  }, [selectedUserSummary]);

  const filteredClinics = useMemo(() => {
    const matchedClinics = !query.trim()
      ? clinics
      : clinics
          .map((clinic) => {
            const doctors = clinic.doctors.filter((doctor) =>
              matchesSearch(query, doctor.name, doctor.email, doctor.userId, doctor.id),
            );
            const patients = clinic.patients.filter((patient) =>
              matchesSearch(query, patient.name, patient.email, patient.userId, patient.id, patient.cpf ?? "", patient.birthDate ?? ""),
            );
            const clinicAdmins = clinic.clinicAdmins.filter((clinicAdmin) =>
              matchesSearch(query, clinicAdmin.name, clinicAdmin.email, clinicAdmin.userId, clinicAdmin.id),
            );
            const clinicMatch = matchesSearch(query, clinic.clinicName, clinic.joinCode, clinic.clinicId);

            if (clinicMatch) return clinic;
            if (doctors.length || patients.length || clinicAdmins.length) return { ...clinic, doctors, patients, clinicAdmins };
            return null;
          })
          .filter((item): item is AdminDashboardClinic => item !== null);

    if (activeFilter === "doctors") {
      return matchedClinics
        .map((clinic) => ({ ...clinic, patients: [] }))
        .filter((clinic) => clinic.doctors.length > 0);
    }

    if (activeFilter === "patients") {
      return matchedClinics
        .map((clinic) => ({ ...clinic, doctors: [] }))
        .filter((clinic) => clinic.patients.length > 0);
    }

    return matchedClinics;
  }, [activeFilter, clinics, query]);

  const selectedClinic = filteredClinics.find((clinic) => clinic.clinicId === selectedClinicId) ?? null;
  const selectedCreateClinic = clinics.find((clinic) => clinic.clinicId === createForm.clinicId) ?? null;
  const clinicSearchResults = useMemo(() => {
    if (!clinicSearch.trim()) return clinics;
    return clinics.filter((clinic) => matchesSearch(clinicSearch, clinic.clinicName, clinic.joinCode, clinic.clinicId));
  }, [clinicSearch, clinics]);

  const totals = useMemo(
    () => ({
      clinics: clinics.length,
      doctors: clinics.reduce((acc, item) => acc + item.doctors.length, 0),
      patients: clinics.reduce((acc, item) => acc + item.patients.length, 0),
      clinicAdmins: clinics.reduce((acc, item) => acc + item.clinicAdmins.length, 0),
    }),
    [clinics],
  );

  const upsertManagedUser = (nextUser: ClinicManagedUser, clinicId: string) => {
    setClinics((current) =>
      current.map((clinic) => {
        if (clinic.clinicId !== clinicId) return clinic;

        const doctors = clinic.doctors.filter((doctor) => doctor.userId !== nextUser.userId);
        const patients = clinic.patients.filter((patient) => patient.userId !== nextUser.userId);
        const clinicAdmins = clinic.clinicAdmins.filter((clinicAdmin) => clinicAdmin.userId !== nextUser.userId);

        if (nextUser.role === "doctor") {
          doctors.unshift({
            id: nextUser.id,
            userId: nextUser.userId,
            name: nextUser.name,
            email: nextUser.email,
            role: "doctor",
          });
        } else if (nextUser.role === "patient") {
          patients.unshift({
            id: nextUser.id,
            userId: nextUser.userId,
            name: nextUser.name,
            email: nextUser.email,
            role: "patient",
            cpf: nextUser.cpf,
            birthDate: nextUser.birthDate,
          });
        } else {
          clinicAdmins.unshift({
            id: nextUser.id,
            userId: nextUser.userId,
            name: nextUser.name,
            email: nextUser.email,
            role: "clinic_admin",
          });
        }

        return { ...clinic, doctors, patients, clinicAdmins };
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
          clinicId: createForm.clinicId,
          name: createForm.name,
          email: createForm.email,
          password: createForm.password,
          role: createForm.role,
          cpf: createForm.role === "patient" ? digitsOnly(createForm.cpf) || null : undefined,
          birthDate: createForm.role === "patient" ? createForm.birthDate || null : undefined,
        }),
      });

      upsertManagedUser(created, createForm.clinicId);
      setCreateForm((current) => ({
        ...emptyCreateForm,
        clinicId: current.clinicId,
      }));
      setSelectedClinicId(null);
      setSelectedUserId(created.userId);
      setFeedback(
        created.role === "doctor"
          ? "Médico cadastrado com sucesso."
          : created.role === "patient"
            ? "Paciente cadastrado com sucesso."
            : "Admin da clínica cadastrado com sucesso.",
      );
      setIsCreateUserModalOpen(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Falha ao cadastrar usuário.");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateClinic = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateClinicError(null);
    setFeedback(null);

    try {
      setCreatingClinic(true);
      const created = await apiRequest<{
        clinicId: string;
        clinicName: string;
        joinCode: string;
        cnpj?: string | null;
        createdAt: string;
      }>("/admin/clinics", {
        method: "POST",
        body: JSON.stringify({
          clinicName: createClinicForm.clinicName,
          cnpj: digitsOnly(createClinicForm.cnpj) || null,
        }),
      });

      setClinics((current) =>
        [...current, { clinicId: created.clinicId, clinicName: created.clinicName, joinCode: created.joinCode, doctors: [], patients: [], clinicAdmins: [] }].sort(
          (left, right) => left.clinicName.localeCompare(right.clinicName),
        ),
      );
      setCreateClinicForm(emptyCreateClinicForm);
      setCreateForm((current) => ({ ...current, clinicId: created.clinicId }));
      setClinicSearch(created.clinicName);
      setSelectedClinicId(created.clinicId);
      setSelectedUserId(null);
      setFeedback("Clínica cadastrada com sucesso.");
      setIsCreateClinicModalOpen(false);
    } catch (err) {
      setCreateClinicError(err instanceof Error ? err.message : "Falha ao cadastrar clínica.");
    } finally {
      setCreatingClinic(false);
    }
  };

  const setProfileField = <K extends keyof PatientProfileFormState>(field: K, value: PatientProfileFormState[K]) => {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const applyZipCode = async (rawZipCode: string) => {
    const zipCode = digitsOnly(rawZipCode);
    if (zipCode.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${zipCode}/json/`);
      const payload = (await response.json()) as ViaCepResponse;

      if (!response.ok || payload.erro) {
        setFeedback("CEP não encontrado. Preencha o endereço manualmente.");
        return;
      }

      setEditForm((current) => ({
        ...current,
        addressZipCode: formatCep(zipCode),
        addressStreet: payload.logradouro?.trim() || current.addressStreet,
        addressComplement: current.addressComplement || payload.complemento?.trim() || "",
        addressNeighborhood: payload.bairro?.trim() || current.addressNeighborhood,
        addressCity: payload.localidade?.trim() || current.addressCity,
        addressState: payload.uf?.trim().toUpperCase() || current.addressState,
      }));
    } catch {
      setFeedback("Não foi possível consultar o CEP agora. Preencha o endereço manualmente.");
    }
  };

  const handleUpdateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUser || !selectedUserSummary) return;

    setEditError(null);
    setFeedback(null);

    try {
      setSaving(true);
      const updated = await apiRequest<AdminManagedUserDetail>(`/admin/users/${selectedUser.userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          password: editForm.password || undefined,
          cpf: selectedUser.role === "patient" ? digitsOnly(editForm.cpf) || null : undefined,
          birthDate: selectedUser.role === "patient" ? editForm.birthDate || null : undefined,
          biologicalSex: selectedUser.role === "patient" ? editForm.biologicalSex || null : undefined,
          phone: selectedUser.role === "patient" ? digitsOnly(editForm.phone) || null : undefined,
          addressZipCode: selectedUser.role === "patient" ? digitsOnly(editForm.addressZipCode) || null : undefined,
          addressStreet: selectedUser.role === "patient" ? editForm.addressStreet || null : undefined,
          addressNumber: selectedUser.role === "patient" ? editForm.addressNumber || null : undefined,
          addressComplement: selectedUser.role === "patient" ? editForm.addressComplement || null : undefined,
          addressNeighborhood: selectedUser.role === "patient" ? editForm.addressNeighborhood || null : undefined,
          addressCity: selectedUser.role === "patient" ? editForm.addressCity || null : undefined,
          addressState: selectedUser.role === "patient" ? editForm.addressState.toUpperCase() || null : undefined,
          emergencyContactName: selectedUser.role === "patient" ? editForm.emergencyContactName || null : undefined,
          emergencyContactPhone: selectedUser.role === "patient" ? digitsOnly(editForm.emergencyContactPhone) || null : undefined,
          clinicId: selectedUserSummary.clinicId,
        }),
      });

      upsertManagedUser(updated, selectedUserSummary.clinicId);
      const nextDetail = {
        ...updated,
        clinicId: selectedUserSummary.clinicId,
        clinicName: selectedUserSummary.clinicName,
        joinCode: selectedUserSummary.joinCode,
      };
      setSelectedUserDetail(nextDetail);
      setEditForm(toEditFormState(nextDetail));
      setFeedback("Perfil atualizado com sucesso.");
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Falha ao atualizar perfil.");
    } finally {
      setSaving(false);
    }
  };

  const focusClinicSection = (clinicId: string) => {
    setSelectedClinicId(clinicId);
    setSelectedUserId(null);
    setSelectedUserDetail(null);
    setEditForm(emptyEditForm);

    const section = document.getElementById(`clinic-${clinicId}`);
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleFilter = (nextFilter: Exclude<AdminEntityFilter, null>) => {
    setActiveFilter((current) => (current === nextFilter ? null : nextFilter));
  };

  const resultCount =
    activeFilter === "clinics" ? filteredClinics.length : activeFilter === null ? filteredClinics.length + filteredUsers.length : filteredUsers.length;

  return (
    <main className="doctor-dashboard admin-dashboard">
      <section className="doctor-hero admin-dashboard-hero">
        <div>
          <span className="doctor-kicker">Painel administrativo</span>
          <h1>Dashboard</h1>
          <p className="muted">
            Acompanhe clínicas, equipes médicas e pacientes em um painel unificado, com a mesma leitura clara dos outros dashboards.
          </p>
        </div>
      </section>

      <section className="doctor-search card">
        <div className="doctor-search-heading">
          <div>
            <h2>Rede assistencial</h2>
            <p className="muted">Pesquise por clínica, código de entrada, nome, e-mail, perfil, CPF, usuário ou data de nascimento.</p>
          </div>
          <span className="doctor-result-chip">{resultCount} resultado(s)</span>
        </div>

        <div className="doctor-facts-grid admin-summary-grid">
          <button
            type="button"
            className={`doctor-fact-card admin-filter-card${activeFilter === "clinics" ? " admin-filter-card-active" : ""}`}
            onClick={() => toggleFilter("clinics")}
          >
            <span className="doctor-fact-label">Clínicas</span>
            <strong>{totals.clinics}</strong>
            <small>Unidades cadastradas no sistema</small>
          </button>
          <button
            type="button"
            className={`doctor-fact-card admin-filter-card${activeFilter === "doctors" ? " admin-filter-card-active" : ""}`}
            onClick={() => toggleFilter("doctors")}
          >
            <span className="doctor-fact-label">Médicos</span>
            <strong>{totals.doctors}</strong>
            <small>Perfis de atendimento ativos</small>
          </button>
          <button
            type="button"
            className={`doctor-fact-card admin-filter-card${activeFilter === "patients" ? " admin-filter-card-active" : ""}`}
            onClick={() => toggleFilter("patients")}
          >
            <span className="doctor-fact-label">Pacientes</span>
            <strong>{totals.patients}</strong>
            <small>Cadastros acompanhados pelas clínicas</small>
          </button>
          <div className="doctor-fact-card">
            <span className="doctor-fact-label">Admins de Clínica</span>
            <strong>{totals.clinicAdmins}</strong>
            <small>Contas gestoras vinculadas</small>
          </div>
        </div>

        <label htmlFor="admin-search" className="sr-only">
          Pesquisar clínica, médico ou paciente
        </label>
        <input
          id="admin-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex.: Clínica Central, 123.456.789-00, maria@, patient_, 1990-08-16"
          className="doctor-search-input"
        />

        {loading && <p>Carregando dashboard...</p>}
        {error && <p className="error">{error}</p>}
        {feedback && <p className="success">{feedback}</p>}

        {!loading && !error && (
          <div className="doctor-search-results">
            {activeFilter !== "doctors" &&
              activeFilter !== "patients" &&
              filteredClinics.map((clinic) => (
                <button
                  key={clinic.clinicId}
                  type="button"
                  className={`doctor-patient-card${clinic.clinicId === selectedClinicId ? " doctor-patient-card-active" : ""}`}
                  onClick={() => focusClinicSection(clinic.clinicId)}
                >
                  <span className="doctor-patient-card-top">
                    <strong>{clinic.clinicName}</strong>
                    <span>Clínica</span>
                  </span>
                  <span className="muted">Código de entrada {clinic.joinCode}</span>
                  <span className="doctor-patient-card-meta">
                    ID {clinic.clinicId} · {clinic.doctors.length} médico(s) · {clinic.patients.length} paciente(s) · {clinic.clinicAdmins.length} admin(s)
                  </span>
                </button>
              ))}
            {filteredUsers.map((user) => {
              const active = user.userId === selectedUserId;
              return (
                <button
                  key={user.userId}
                  type="button"
                  className={`doctor-patient-card${active ? " doctor-patient-card-active" : ""}`}
                  onClick={() => {
                    setSelectedClinicId(null);
                    setSelectedUserId(user.userId);
                  }}
                >
                  <span className="doctor-patient-card-top">
                    <strong>{user.name}</strong>
                    <span>{user.role === "doctor" ? "Médico" : user.role === "clinic_admin" ? "Admin da Clínica" : formatDate(user.birthDate)}</span>
                  </span>
                  <span className="muted">{user.email}</span>
                  <span className="doctor-patient-card-meta">
                    {user.role === "doctor"
                      ? "Perfil médico"
                      : user.role === "clinic_admin"
                        ? "Perfil admin da clínica"
                        : `Perfil paciente · CPF ${user.cpf ? formatCpf(user.cpf) : "pendente"}`}{" "}
                    · {user.clinicName}
                  </span>
                </button>
              );
            })}
            {filteredClinics.length === 0 && filteredUsers.length === 0 && (
              <p className="muted">Nenhum perfil encontrado para a busca atual.</p>
            )}
          </div>
        )}

        {!loading && !error && filteredClinics.length === 0 && filteredUsers.length === 0 && (
          <div className="patient-dashboard-empty-state admin-dashboard-empty-state">
            <div>
              <strong>Nenhum resultado para a busca atual</strong>
              <p className="muted">Tente outro nome, identificador, e-mail ou código de clínica para refinar a consulta.</p>
            </div>
          </div>
        )}
      </section>

      <section className="doctor-record-shell">
        <div className="doctor-record-main admin-management-grid">
          <section className="admin-editor-card">
            <section className="card doctor-record-card">
              <div className="doctor-record-header">
                <div>
                  <span className="doctor-section-label">Cadastro</span>
                  <h2>Ações de cadastro</h2>
                  <p className="muted">Abra o pop-up de criação para cadastrar clínica ou usuário sem sair do dashboard.</p>
                </div>
              </div>

              <div className="patient-onboarding-actions patient-profile-actions">
                <button
                  type="button"
                  className="doctor-action-button doctor-action-button-primary"
                  onClick={() => {
                    setCreateClinicError(null);
                    setIsCreateClinicModalOpen(true);
                  }}
                >
                  Nova clínica
                </button>
                <button
                  type="button"
                  className="doctor-action-button"
                  onClick={() => {
                    setCreateError(null);
                    setIsCreateUserModalOpen(true);
                  }}
                >
                  Novo usuário
                </button>
              </div>
            </section>

            <div className="doctor-record-header">
              <div>
                <span className="doctor-section-label">Edição</span>
                <h2>
                  {selectedUser
                    ? `Editar ${selectedUser.name}`
                    : selectedClinic
                      ? `Visualizar ${selectedClinic.clinicName}`
                      : "Selecione um perfil"}
                </h2>
                <p className="muted">Atualize dados cadastrais diretamente do painel administrativo global.</p>
              </div>
            </div>

            {!selectedUser && !selectedClinic && (
              <section className="card doctor-record-card">
                <div className="patient-dashboard-empty-state admin-dashboard-empty-state">
                  <div>
                    <strong>Escolha um médico ou paciente</strong>
                    <p className="muted">Clique em um card acima para abrir o painel de edição.</p>
                  </div>
                </div>
              </section>
            )}

            {!selectedUser && selectedClinic && (
              <section className="card doctor-record-card">
                <div className="doctor-record-header">
                  <div>
                    <span className="doctor-section-label">Clínica</span>
                    <h2>{selectedClinic.clinicName}</h2>
                    <p className="muted">Visualização institucional da clínica selecionada.</p>
                  </div>
                </div>

                <section className="doctor-anamnesis-card">
                  <h3>Identificação</h3>
                  <div className="doctor-facts-grid">
                    <article className="doctor-fact-card">
                      <span className="doctor-fact-label">Clínica</span>
                      <strong>{selectedClinic.clinicName}</strong>
                      <small>ID {selectedClinic.clinicId}</small>
                    </article>
                    <article className="doctor-fact-card">
                      <span className="doctor-fact-label">Código de entrada</span>
                      <strong>{selectedClinic.joinCode}</strong>
                      <small>Código usado para vinculação</small>
                    </article>
                  </div>
                </section>

                <section className="doctor-anamnesis-card">
                  <h3>Rede vinculada</h3>
                  <div className="doctor-facts-grid">
                    <article className="doctor-fact-card">
                      <span className="doctor-fact-label">Médicos</span>
                      <strong>{selectedClinic.doctors.length}</strong>
                      <small>Perfis médicos vinculados</small>
                    </article>
                    <article className="doctor-fact-card">
                      <span className="doctor-fact-label">Pacientes</span>
                      <strong>{selectedClinic.patients.length}</strong>
                      <small>Cadastros acompanhados por esta clínica</small>
                    </article>
                    <article className="doctor-fact-card">
                      <span className="doctor-fact-label">Admins da Clínica</span>
                      <strong>{selectedClinic.clinicAdmins.length}</strong>
                      <small>Responsáveis vinculados a esta clínica</small>
                    </article>
                  </div>
                </section>
              </section>
            )}

            {selectedUser && (
              <form className="patient-onboarding-form" onSubmit={handleUpdateUser}>
                <section className="card doctor-record-card">
                  <div className="doctor-record-header">
                    <div>
                      <span className="doctor-section-label">Conta</span>
                      <h2>Nome e e-mail</h2>
                      <p className="muted">Esses dados identificam o usuário no acesso e nos painéis internos.</p>
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
                      <h2>Dados do usuário selecionado</h2>
                      <p className="muted">
                        {selectedUser.role === "patient"
                          ? "O admin pode revisar e editar todos os dados cadastrais do paciente nesta tela."
                          : selectedUser.role === "clinic_admin"
                            ? "O admin pode ajustar os dados de acesso do admin da clínica nesta tela."
                            : "O admin pode ajustar acesso e dados básicos do médico nesta tela."}
                      </p>
                    </div>
                  </div>

                  <section className="doctor-anamnesis-card">
                    <h3>Metadados</h3>
                    <div className="doctor-facts-grid">
                      <article className="doctor-fact-card">
                        <span className="doctor-fact-label">Tipo de perfil</span>
                        <strong>
                          {selectedUser.role === "doctor"
                            ? "Médico"
                            : selectedUser.role === "clinic_admin"
                              ? "Admin da Clínica"
                              : "Paciente"}
                        </strong>
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
                  </section>

                  {selectedUser.role === "patient" && (
                    <>
                      <section className="doctor-anamnesis-card">
                        <h3>Dados pessoais</h3>
                        <div className="patient-onboarding-grid">
                          <label>
                            CPF
                            <input
                              value={editForm.cpf}
                              onChange={(event) => setProfileField("cpf", formatCpf(event.target.value))}
                              placeholder="000.000.000-00"
                              inputMode="numeric"
                              maxLength={14}
                              required
                            />
                          </label>
                          <label>
                            Data de nascimento
                            <input type="date" value={editForm.birthDate} onChange={(event) => setProfileField("birthDate", event.target.value)} required />
                          </label>
                          <label>
                            Sexo biológico
                            <select
                              value={editForm.biologicalSex}
                              onChange={(event) => setProfileField("biologicalSex", event.target.value as PatientProfileFormState["biologicalSex"])}
                              required
                            >
                              <option value="">Selecione</option>
                              <option value="masculino">Masculino</option>
                              <option value="feminino">Feminino</option>
                            </select>
                          </label>
                          <label>
                            Telefone
                            <input
                              value={editForm.phone}
                              onChange={(event) => setProfileField("phone", formatPhone(event.target.value))}
                              placeholder="(11) 99999-9999"
                              inputMode="numeric"
                              maxLength={15}
                              required
                            />
                          </label>
                        </div>
                      </section>

                      <section className="doctor-anamnesis-card">
                        <h3>Endereco</h3>
                        <div className="patient-onboarding-grid">
                          <label>
                            CEP
                            <input
                              value={editForm.addressZipCode}
                              onChange={(event) => setProfileField("addressZipCode", formatCep(event.target.value))}
                              onBlur={(event) => void applyZipCode(event.target.value)}
                              placeholder="00000-000"
                              inputMode="numeric"
                              maxLength={9}
                              required
                            />
                          </label>
                          <label>
                            Rua
                            <input value={editForm.addressStreet} onChange={(event) => setProfileField("addressStreet", event.target.value)} required />
                          </label>
                          <label>
                            Numero
                            <input value={editForm.addressNumber} onChange={(event) => setProfileField("addressNumber", event.target.value)} required />
                          </label>
                          <label>
                            Complemento
                            <input value={editForm.addressComplement} onChange={(event) => setProfileField("addressComplement", event.target.value)} />
                          </label>
                          <label>
                            Bairro
                            <input value={editForm.addressNeighborhood} onChange={(event) => setProfileField("addressNeighborhood", event.target.value)} required />
                          </label>
                          <label>
                            Cidade
                            <input value={editForm.addressCity} onChange={(event) => setProfileField("addressCity", event.target.value)} required />
                          </label>
                          <label>
                            Estado
                            <input
                              value={editForm.addressState}
                              onChange={(event) => setProfileField("addressState", event.target.value.toUpperCase())}
                              maxLength={2}
                              required
                            />
                          </label>
                        </div>
                      </section>

                      <section className="doctor-anamnesis-card">
                        <h3>Contato de emergência</h3>
                        <div className="patient-onboarding-grid">
                          <label>
                            Nome do contato
                            <input value={editForm.emergencyContactName} onChange={(event) => setProfileField("emergencyContactName", event.target.value)} required />
                          </label>
                          <label>
                            Telefone do contato
                            <input
                              value={editForm.emergencyContactPhone}
                              onChange={(event) => setProfileField("emergencyContactPhone", formatPhone(event.target.value))}
                              placeholder="(11) 99999-9999"
                              inputMode="numeric"
                              maxLength={15}
                              required
                            />
                          </label>
                        </div>
                      </section>
                    </>
                  )}

                  <section className="doctor-anamnesis-card">
                    <h3>Acesso</h3>
                    <div className="patient-onboarding-grid">
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
                    <button
                      type="submit"
                      className="doctor-action-button doctor-action-button-primary"
                      disabled={saving || loadingSelectedUser}
                    >
                      {saving ? "Salvando..." : "Salvar perfil"}
                    </button>
                  </div>

                  {loadingSelectedUser && <p className="muted">Carregando dados completos do perfil...</p>}
                  {editError && <p className="error">{editError}</p>}
                </section>
              </form>
            )}
          </section>
        </div>
      </section>

      {isCreateClinicModalOpen && (
        <div className="confirm-save-dialog" role="dialog" aria-modal="true" aria-labelledby="create-clinic-title">
          <div className="confirm-save-card admin-create-modal">
            <div className="doctor-record-header">
              <div>
                <span className="doctor-section-label">Cadastro</span>
                <h2 id="create-clinic-title">Criar clínica</h2>
                <p className="muted">Cadastre uma nova clínica e deixe a unidade disponível para futuros vínculos.</p>
              </div>
            </div>

            <form className="patient-onboarding-form" onSubmit={handleCreateClinic}>
              <div className="patient-onboarding-grid">
                <label>
                  Nome da clínica
                  <input
                    value={createClinicForm.clinicName}
                    onChange={(event) => setCreateClinicForm((current) => ({ ...current, clinicName: event.target.value }))}
                    required
                  />
                </label>

                <label>
                  CNPJ
                  <input
                    value={createClinicForm.cnpj}
                    onChange={(event) => setCreateClinicForm((current) => ({ ...current, cnpj: digitsOnly(event.target.value).slice(0, 14) }))}
                    placeholder="Somente números"
                    inputMode="numeric"
                    maxLength={14}
                  />
                </label>
              </div>

              <div className="patient-onboarding-actions patient-profile-actions">
                <button type="button" className="doctor-action-button" onClick={() => setIsCreateClinicModalOpen(false)} disabled={creatingClinic}>
                  Cancelar
                </button>
                <button type="submit" className="doctor-action-button doctor-action-button-primary" disabled={creatingClinic}>
                  {creatingClinic ? "Cadastrando..." : "Criar clínica"}
                </button>
              </div>

              {createClinicError && <p className="error">{createClinicError}</p>}
            </form>
          </div>
        </div>
      )}

      {isCreateUserModalOpen && (
        <div className="confirm-save-dialog" role="dialog" aria-modal="true" aria-labelledby="create-user-title">
          <div className="confirm-save-card admin-create-modal admin-create-modal-wide">
            <div className="doctor-record-header">
              <div>
                <span className="doctor-section-label">Cadastro</span>
                <h2 id="create-user-title">Criar usuário</h2>
                <p className="muted">Crie médico, paciente ou admin da clínica e vincule pela busca de clínica.</p>
              </div>
            </div>

            <form className="patient-onboarding-form" onSubmit={handleCreateUser}>
              <div className="patient-onboarding-grid">
                <label>
                  Perfil
                  <select
                    value={createForm.role}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        role: event.target.value as CreateAdminUserFormState["role"],
                        cpf: event.target.value === "patient" ? current.cpf : "",
                        birthDate: event.target.value === "patient" ? current.birthDate : "",
                      }))
                    }
                    required
                  >
                    <option value="doctor">Médico</option>
                    <option value="patient">Paciente</option>
                    <option value="clinic_admin">Admin da Clínica</option>
                  </select>
                </label>

                <label>
                  Nome
                  <input
                    value={createForm.name}
                    onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                    required
                  />
                </label>

                <label>
                  E-mail
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
                    required
                  />
                </label>

                <label>
                  Senha inicial
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
                    required
                  />
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
                        required
                      />
                    </label>
                    <label>
                      Data de nascimento
                      <input
                        type="date"
                        value={createForm.birthDate}
                        onChange={(event) => setCreateForm((current) => ({ ...current, birthDate: event.target.value }))}
                        required
                      />
                    </label>
                  </>
                )}
              </div>

              <div className="doctor-record-card admin-create-clinic-picker">
                <div className="doctor-record-header">
                  <div>
                    <span className="doctor-section-label">Clínica</span>
                    <h3>Buscar e vincular</h3>
                    <p className="muted">Escolha a clínica digitando nome, código de entrada ou ID. Sem dropdown.</p>
                  </div>
                </div>

                <label>
                  Buscar clínica
                  <input
                    value={clinicSearch}
                    onChange={(event) => setClinicSearch(event.target.value)}
                    placeholder="Ex.: Clínica Central, CL-AB12CD34EF ou clinic_123"
                  />
                </label>

                {selectedCreateClinic && (
                  <p className="muted" style={{ marginTop: "0.75rem" }}>
                    Clínica selecionada: <strong>{selectedCreateClinic.clinicName}</strong> · {selectedCreateClinic.joinCode}
                  </p>
                )}

                <div className="doctor-search-results" style={{ marginTop: "1rem" }}>
                  {clinicSearchResults.slice(0, 8).map((clinic) => (
                    <button
                      key={clinic.clinicId}
                      type="button"
                      className={`doctor-patient-card${clinic.clinicId === createForm.clinicId ? " doctor-patient-card-active" : ""}`}
                      onClick={() => {
                        setCreateForm((current) => ({ ...current, clinicId: clinic.clinicId }));
                        setClinicSearch(clinic.clinicName);
                      }}
                    >
                      <span className="doctor-patient-card-top">
                        <strong>{clinic.clinicName}</strong>
                        <span>Clínica</span>
                      </span>
                      <span className="muted">Código de entrada {clinic.joinCode}</span>
                      <span className="doctor-patient-card-meta">
                        ID {clinic.clinicId} · {clinic.doctors.length} médico(s) · {clinic.patients.length} paciente(s) · {clinic.clinicAdmins.length} admin(s)
                      </span>
                    </button>
                  ))}
                  {clinicSearchResults.length === 0 && <p className="muted">Nenhuma clínica encontrada para essa busca.</p>}
                </div>
              </div>

              <div className="patient-onboarding-actions patient-profile-actions">
                <button type="button" className="doctor-action-button" onClick={() => setIsCreateUserModalOpen(false)} disabled={creating}>
                  Cancelar
                </button>
                <button type="submit" className="doctor-action-button doctor-action-button-primary" disabled={creating || !createForm.clinicId}>
                  {creating ? "Cadastrando..." : "Criar usuário"}
                </button>
              </div>

              {createError && <p className="error">{createError}</p>}
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
