"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { pushFlashToast } from "@/lib/flash-toast";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { digitsOnly, formatCep, formatCpf, formatPhone } from "@/lib/patient-fields";
import { roleDefaultPath } from "@/lib/role-utils";
import { useAuth } from "@/providers/auth-provider";
import type { Patient, User } from "@/types/domain";

interface AccountFormState {
  name: string;
  email: string;
}

interface PatientProfileFormState {
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
}

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

type ZipCodeValidationResult = "valid" | "invalid" | "unavailable";

const emptyProfileForm: PatientProfileFormState = {
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

const toProfileFormState = (patient: Patient): PatientProfileFormState => ({
  cpf: patient.cpf ? formatCpf(patient.cpf) : "",
  birthDate: patient.birthDate ?? "",
  biologicalSex: patient.biologicalSex ?? "",
  phone: patient.phone ?? "",
  addressZipCode: patient.addressZipCode ?? "",
  addressStreet: patient.addressStreet ?? "",
  addressNumber: patient.addressNumber ?? "",
  addressComplement: patient.addressComplement ?? "",
  addressNeighborhood: patient.addressNeighborhood ?? "",
  addressCity: patient.addressCity ?? "",
  addressState: patient.addressState ?? "",
  emergencyContactName: patient.emergencyContactName ?? "",
  emergencyContactPhone: patient.emergencyContactPhone ?? "",
});

export default function PatientProfilePage() {
  useAuthRedirect({ allowIncompleteOnboarding: true });

  const router = useRouter();
  const { session, updateSessionUser } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [accountForm, setAccountForm] = useState<AccountFormState>({
    name: session?.user.name ?? "",
    email: session?.user.email ?? "",
  });
  const [profileForm, setProfileForm] = useState<PatientProfileFormState>(emptyProfileForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingZipCode, setLoadingZipCode] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"error" | "info">("info");

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setStatus(null);
        setStatusTone("info");
        const profile = await apiRequest<Patient>("/patients/me/profile");
        setPatient(profile);
        setProfileForm(toProfileFormState(profile));
        setAccountForm({
          name: session?.user.name ?? "",
          email: session?.user.email ?? "",
        });
      } catch (err) {
        setStatusTone("error");
        setStatus(err instanceof Error ? err.message : "Falha ao carregar perfil.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [session?.user.email, session?.user.name]);

  const setProfileField = <K extends keyof PatientProfileFormState>(field: K, value: PatientProfileFormState[K]) => {
    setProfileForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const validateZipCode = async (rawZipCode: string, autofill = false): Promise<ZipCodeValidationResult> => {
    const zipCode = digitsOnly(rawZipCode);
    if (zipCode.length !== 8) return "valid";

    try {
      setLoadingZipCode(true);
      const response = await fetch(`https://viacep.com.br/ws/${zipCode}/json/`);
      const payload = (await response.json()) as ViaCepResponse;

      if (!response.ok || payload.erro) {
        setStatusTone("error");
        setStatus("CEP invalido. Revise o numero informado antes de salvar.");
        return "invalid";
      }

      if (autofill) {
        setProfileForm((current) => ({
          ...current,
          addressZipCode: formatCep(zipCode),
          addressStreet: payload.logradouro?.trim() || current.addressStreet,
          addressComplement: current.addressComplement || payload.complemento?.trim() || "",
          addressNeighborhood: payload.bairro?.trim() || current.addressNeighborhood,
          addressCity: payload.localidade?.trim() || current.addressCity,
          addressState: payload.uf?.trim().toUpperCase() || current.addressState,
        }));
      }
      setStatus(null);
      setStatusTone("info");
      return "valid";
    } catch {
      setStatusTone("info");
      setStatus("Nao foi possivel consultar o CEP agora. Preencha o endereco manualmente.");
      return "unavailable";
    } finally {
      setLoadingZipCode(false);
    }
  };

  const applyZipCode = async (rawZipCode: string) => {
    await validateZipCode(rawZipCode, true);
  };

  const submitProfile = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setSaving(true);
      setStatus(null);
      setStatusTone("info");
      const zipCodeValidation = await validateZipCode(profileForm.addressZipCode);
      if (zipCodeValidation === "invalid") return;

      const updatedUser = await apiRequest<User>("/auth/me", {
        method: "PUT",
        body: JSON.stringify(accountForm),
      });
      const updated = await apiRequest<Patient>("/patients/me/profile", {
        method: "PUT",
        body: JSON.stringify({
          ...profileForm,
          cpf: digitsOnly(profileForm.cpf),
          phone: digitsOnly(profileForm.phone),
          addressZipCode: digitsOnly(profileForm.addressZipCode),
          addressState: profileForm.addressState.toUpperCase(),
          emergencyContactPhone: digitsOnly(profileForm.emergencyContactPhone),
        }),
      });
      setPatient(updated);
      setProfileForm(toProfileFormState(updated));
      updateSessionUser(updatedUser);
      setAccountForm({
        name: updatedUser.name,
        email: updatedUser.email,
      });
      pushFlashToast("Perfil atualizado com sucesso.");
      router.push(roleDefaultPath("patient"));
    } catch (err) {
      setStatusTone("error");
      setStatus(err instanceof Error ? err.message : "Falha ao atualizar conta e perfil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="doctor-dashboard">
      <section className="doctor-hero">
        <div>
          <span className="doctor-kicker">Meu perfil</span>
          <h1>{session?.user.name ?? "Perfil do paciente"}</h1>
          <p className="muted">Edite sua conta e seus dados cadastrais. O historico clinico fica centralizado na anamnese.</p>
        </div>
      </section>

      {loading ? (
        <p>Carregando perfil...</p>
      ) : (
        <>
          {!patient?.onboardingCompleted && (
            <section className="card profile-pending-alert" role="alert">
              <strong>Cadastro pendente</strong>
              <p>
                Seu acesso ainda depende da conclusao do cadastro. Revise e preencha todos os campos obrigatorios,
                incluindo CPF, para liberar o dashboard normalmente.
              </p>
            </section>
          )}

          <form className="patient-onboarding-form" onSubmit={submitProfile}>
            <section className="card doctor-record-card">
              <div className="doctor-record-header">
                <div>
                  <span className="doctor-section-label">Conta</span>
                  <h2>Nome e e-mail</h2>
                  <p className="muted">Esses dados aparecem no acesso e na identificacao da sua conta.</p>
                </div>
              </div>

              <section className="doctor-anamnesis-card">
                <div className="patient-onboarding-grid">
                  <label>
                    Nome
                    <input value={accountForm.name} onChange={(event) => setAccountForm((current) => ({ ...current, name: event.target.value }))} required />
                  </label>
                  <label>
                    E-mail
                    <input
                      type="email"
                      value={accountForm.email}
                      onChange={(event) => setAccountForm((current) => ({ ...current, email: event.target.value }))}
                      required
                    />
                  </label>
                </div>
              </section>
            </section>

            <section className="card doctor-record-card">
              <div className="doctor-record-header">
                <div>
                  <span className="doctor-section-label">Cadastro</span>
                  <h2>Dados pessoais e endereco</h2>
                  <p className="muted">Voce pode atualizar esses dados a qualquer momento.</p>
                </div>
              </div>

              <section className="doctor-anamnesis-card">
                <h3>Dados pessoais</h3>
                <div className="patient-onboarding-grid">
                  <label>
                    CPF
                    <input
                      value={profileForm.cpf}
                      onChange={(event) => setProfileField("cpf", formatCpf(event.target.value))}
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                      maxLength={14}
                      required
                    />
                  </label>
                  <label>
                    Data de nascimento
                    <input type="date" value={profileForm.birthDate} onChange={(event) => setProfileField("birthDate", event.target.value)} required />
                  </label>
                  <label>
                    Sexo biologico
                    <select
                      value={profileForm.biologicalSex}
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
                      value={profileForm.phone}
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
                      value={profileForm.addressZipCode}
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
                    <input value={profileForm.addressStreet} onChange={(event) => setProfileField("addressStreet", event.target.value)} required />
                  </label>
                  <label>
                    Numero
                    <input value={profileForm.addressNumber} onChange={(event) => setProfileField("addressNumber", event.target.value)} required />
                  </label>
                  <label>
                    Complemento
                    <input value={profileForm.addressComplement} onChange={(event) => setProfileField("addressComplement", event.target.value)} />
                  </label>
                  <label>
                    Bairro
                    <input value={profileForm.addressNeighborhood} onChange={(event) => setProfileField("addressNeighborhood", event.target.value)} required />
                  </label>
                  <label>
                    Cidade
                    <input value={profileForm.addressCity} onChange={(event) => setProfileField("addressCity", event.target.value)} required />
                  </label>
                  <label>
                    Estado
                    <input
                      value={profileForm.addressState}
                      onChange={(event) => setProfileField("addressState", event.target.value.toUpperCase())}
                      maxLength={2}
                      required
                    />
                  </label>
                </div>
              </section>

              <section className="doctor-anamnesis-card">
                <h3>Contato de emergencia</h3>
                <div className="patient-onboarding-grid">
                  <label>
                    Nome do contato
                    <input value={profileForm.emergencyContactName} onChange={(event) => setProfileField("emergencyContactName", event.target.value)} required />
                  </label>
                  <label>
                    Telefone do contato
                    <input
                      value={profileForm.emergencyContactPhone}
                      onChange={(event) => setProfileField("emergencyContactPhone", formatPhone(event.target.value))}
                      placeholder="(11) 99999-9999"
                      inputMode="numeric"
                      maxLength={15}
                      required
                    />
                  </label>
                </div>
              </section>

              <div className="patient-onboarding-actions patient-profile-actions">
                {status && (
                  <div className={`form-inline-alert ${statusTone === "error" ? "error" : "info"}`} role={statusTone === "error" ? "alert" : "status"}>
                    <strong>{statusTone === "error" ? "Nao foi possivel salvar" : "Aviso sobre o CEP"}</strong>
                    <span>{status}</span>
                  </div>
                )}
                <button type="submit" disabled={saving} className="doctor-action-button doctor-action-button-primary">
                  {saving ? "Salvando..." : "Salvar perfil e conta"}
                </button>
              </div>
            </section>
          </form>

          <section className="card doctor-record-card">
            <div className="doctor-record-header">
              <div>
                <span className="doctor-section-label">Historico clinico</span>
                <h2>Anamnese e sintomas</h2>
                <p className="muted">Qualquer alteracao no historico clinico deve ser feita na anamnese.</p>
              </div>
              <Link href="/patient/anamnesis" className="doctor-action-button doctor-action-button-primary">
                Abrir anamnese
              </Link>
            </div>

            <div className="doctor-facts-grid">
              <article className="doctor-fact-card">
                <span className="doctor-fact-label">Status do cadastro</span>
                <strong>{patient?.onboardingCompleted ? "Completo" : "Pendente"}</strong>
                <small>Atualize os dados acima sempre que necessario</small>
              </article>
              <article className="doctor-fact-card">
                <span className="doctor-fact-label">Historico clinico</span>
                <strong>Pela anamnese</strong>
                <small>Alergias, sintomas e contexto de saude ficam centralizados la</small>
              </article>
            </div>
          </section>

          {loadingZipCode && <p className="muted">Buscando endereco pelo CEP...</p>}
        </>
      )}
    </main>
  );
}
