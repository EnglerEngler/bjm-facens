"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { pushFlashToast } from "@/lib/flash-toast";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { digitsOnly, formatCep, formatCpf, formatPhone } from "@/lib/patient-fields";
import { useAuth } from "@/providers/auth-provider";
import type { Patient, User } from "@/types/domain";

interface AccountFormState {
  name: string;
  email: string;
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

const emptyForm: PatientProfileFormState = {
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

const toFormState = (patient: Patient): PatientProfileFormState => ({
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

export default function PatientOnboardingPage() {
  useAuthRedirect({ allowIncompleteOnboarding: true });

  const router = useRouter();
  const { session, updateSessionUser } = useAuth();
  const [accountForm, setAccountForm] = useState<AccountFormState>({
    name: session?.user.name ?? "",
    email: session?.user.email ?? "",
  });
  const [form, setForm] = useState<PatientProfileFormState>(emptyForm);
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
        const patient = await apiRequest<Patient>("/patients/me/profile");
        setForm(toFormState(patient));
        setAccountForm({
          name: session?.user.name ?? "",
          email: session?.user.email ?? "",
        });
      } catch (err) {
        setStatusTone("error");
        setStatus(err instanceof Error ? err.message : "Falha ao carregar seu cadastro.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [session?.user.email, session?.user.name]);

  const setField = <K extends keyof PatientProfileFormState>(field: K, value: PatientProfileFormState[K]) => {
    setForm((current) => ({
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
        setStatus("CEP inválido. Revise o número informado antes de salvar.");
        return "invalid";
      }

      if (autofill) {
        setForm((current) => ({
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
      setStatus("Não foi possível consultar o CEP agora. Preencha o endereço manualmente.");
      return "unavailable";
    } finally {
      setLoadingZipCode(false);
    }
  };

  const applyZipCode = async (rawZipCode: string) => {
    await validateZipCode(rawZipCode, true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setSaving(true);
      setStatus(null);
      setStatusTone("info");
      const zipCodeValidation = await validateZipCode(form.addressZipCode);
      if (zipCodeValidation === "invalid") return;
      if (!session) throw new Error("Sessão não encontrada.");
      const updatedUser = await apiRequest<User>("/auth/me/onboarding", {
        method: "PUT",
        body: JSON.stringify({
          name: accountForm.name,
          email: accountForm.email,
        }),
      });
      await apiRequest<Patient>("/patients/me/profile", {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          cpf: digitsOnly(form.cpf),
          phone: digitsOnly(form.phone),
          addressZipCode: digitsOnly(form.addressZipCode),
          addressState: form.addressState.toUpperCase(),
          emergencyContactPhone: digitsOnly(form.emergencyContactPhone),
        }),
      });
      updateSessionUser(updatedUser);
      pushFlashToast("Perfil configurado com sucesso.");
      router.push("/patient/dashboard");
    } catch (err) {
      setStatusTone("error");
      setStatus(err instanceof Error ? err.message : "Falha ao concluir cadastro.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="doctor-dashboard">
      <section className="doctor-hero">
        <div>
          <span className="doctor-kicker">Onboarding do paciente</span>
          <h1>Complete seu cadastro antes de entrar na plataforma</h1>
          <p className="muted">
            Precisamos de alguns dados pessoais e de contato para liberar seu acesso, estruturar a anamnese e manter
            seu prontuário consistente.
          </p>
        </div>
        <div className="doctor-hero-meta">
          <span>Conta: {session?.user.email ?? "Não identificada"}</span>
          <span>Perfil de paciente em ativação</span>
          <span>Preencha os dados obrigatorios</span>
        </div>
      </section>

      <section className="card doctor-record-card">
        <div className="doctor-record-header">
          <div>
            <span className="doctor-section-label">Cadastro inicial</span>
            <h2>Dados da conta e do perfil</h2>
            <p className="muted">Preencha os dados pessoais, contato e endereço. O acesso ao dashboard será liberado ao concluir.</p>
          </div>
        </div>

        {loading ? (
          <p>Carregando seus dados...</p>
        ) : (
          <form className="patient-onboarding-form" onSubmit={submit}>
            <section className="doctor-anamnesis-card">
              <h3>Conta</h3>
              <div className="patient-onboarding-grid">
                <label>
                  Nome
                  <input
                    value={accountForm.name}
                    onChange={(event) => setAccountForm((current) => ({ ...current, name: event.target.value }))}
                    required
                  />
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

            <section className="doctor-anamnesis-card">
              <h3>Dados pessoais</h3>
              <div className="patient-onboarding-grid">
                <label>
                  CPF
                  <input
                    value={form.cpf}
                    onChange={(event) => setField("cpf", formatCpf(event.target.value))}
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
                    value={form.birthDate}
                    onChange={(event) => setField("birthDate", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Sexo biológico
                  <select
                    value={form.biologicalSex}
                    onChange={(event) => setField("biologicalSex", event.target.value as PatientProfileFormState["biologicalSex"])}
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
                    value={form.phone}
                    onChange={(event) => setField("phone", formatPhone(event.target.value))}
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
                    value={form.addressZipCode}
                    onChange={(event) => setField("addressZipCode", formatCep(event.target.value))}
                    onBlur={(event) => void applyZipCode(event.target.value)}
                    placeholder="00000-000"
                    inputMode="numeric"
                    maxLength={9}
                    required
                  />
                </label>
                <label>
                  Rua
                  <input value={form.addressStreet} onChange={(event) => setField("addressStreet", event.target.value)} required />
                </label>
                <label>
                  Numero
                  <input value={form.addressNumber} onChange={(event) => setField("addressNumber", event.target.value)} required />
                </label>
                <label>
                  Complemento
                  <input value={form.addressComplement} onChange={(event) => setField("addressComplement", event.target.value)} />
                </label>
                <label>
                  Bairro
                  <input
                    value={form.addressNeighborhood}
                    onChange={(event) => setField("addressNeighborhood", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Cidade
                  <input value={form.addressCity} onChange={(event) => setField("addressCity", event.target.value)} required />
                </label>
                <label>
                  Estado
                  <input
                    value={form.addressState}
                    onChange={(event) => setField("addressState", event.target.value.toUpperCase())}
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
                  <input
                    value={form.emergencyContactName}
                    onChange={(event) => setField("emergencyContactName", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Telefone do contato
                  <input
                    value={form.emergencyContactPhone}
                    onChange={(event) => setField("emergencyContactPhone", formatPhone(event.target.value))}
                    placeholder="(11) 99999-9999"
                    inputMode="numeric"
                    maxLength={15}
                    required
                  />
                </label>
              </div>
            </section>

            <div className="patient-onboarding-actions">
              {status && (
                <div className={`form-inline-alert ${statusTone === "error" ? "error" : "info"}`} role={statusTone === "error" ? "alert" : "status"}>
                  <strong>{statusTone === "error" ? "Não foi possível concluir" : "Aviso sobre o CEP"}</strong>
                  <span>{status}</span>
                </div>
              )}
              <button type="submit" disabled={saving} className="doctor-action-button doctor-action-button-primary">
                {saving ? "Salvando..." : "Concluir cadastro"}
              </button>
            </div>

            {loadingZipCode && <p className="muted">Buscando endereço pelo CEP...</p>}
          </form>
        )}
      </section>
    </main>
  );
}
