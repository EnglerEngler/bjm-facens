"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { pushFlashToast } from "@/lib/flash-toast";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { roleDefaultPath } from "@/lib/role-utils";
import type { ClinicProfile } from "@/types/domain";

const digitsOnly = (value: string) => value.replace(/\D/g, "");

const formatCnpj = (value: string) => {
  const digits = digitsOnly(value).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

export default function ClinicProfilePage() {
  useAuthRedirect({ allowIncompleteOnboarding: true });

  const router = useRouter();
  const [clinic, setClinic] = useState<ClinicProfile | null>(null);
  const [clinicForm, setClinicForm] = useState({ clinicName: "", cnpj: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setStatus(null);
        const payload = await apiRequest<ClinicProfile>("/auth/me/clinic");
        setClinic(payload);
        setClinicForm({
          clinicName: payload.clinicName,
          cnpj: formatCnpj(payload.cnpj ?? ""),
        });
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Falha ao carregar perfil da clinica.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setSaving(true);
      setStatus(null);
      const updatedClinic = await apiRequest<ClinicProfile>("/auth/me/clinic", {
        method: "PUT",
        body: JSON.stringify({
          clinicName: clinicForm.clinicName,
          cnpj: digitsOnly(clinicForm.cnpj),
        }),
      });

      setClinic(updatedClinic);
      setClinicForm({
        clinicName: updatedClinic.clinicName,
        cnpj: formatCnpj(updatedClinic.cnpj ?? ""),
      });
      pushFlashToast("Dados da clinica atualizados com sucesso.");
      router.push(roleDefaultPath("clinic_admin"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao atualizar perfil da clinica.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="doctor-dashboard">
      <section className="doctor-hero clinic-hero">
        <div>
          <span className="doctor-kicker">Perfil da clinica</span>
          <h1>{clinic?.clinicName ?? "Clinica"}</h1>
          <p className="muted">Edite os dados institucionais da clinica, incluindo o CNPJ e o nome exibido na plataforma.</p>
        </div>
      </section>

      {loading ? (
        <p>Carregando perfil...</p>
      ) : (
        <>
          <form className="patient-onboarding-form" onSubmit={submit}>
            <section className="card doctor-record-card">
              <div className="doctor-record-header">
                <div>
                  <span className="doctor-section-label">Clinica</span>
                  <h2>Dados institucionais</h2>
                  <p className="muted">Atualize as informacoes basicas da clinica e mantenha o CNPJ consistente.</p>
                </div>
              </div>

              <section className="doctor-anamnesis-card">
                <div className="patient-onboarding-grid">
                  <label>
                    Nome da clinica
                    <input
                      value={clinicForm.clinicName}
                      onChange={(event) => setClinicForm((current) => ({ ...current, clinicName: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    CNPJ
                    <input
                      value={clinicForm.cnpj}
                      onChange={(event) => setClinicForm((current) => ({ ...current, cnpj: formatCnpj(event.target.value) }))}
                      inputMode="numeric"
                      maxLength={18}
                      placeholder="00.000.000/0000-00"
                      required
                    />
                  </label>
                </div>
              </section>

              <div className="patient-onboarding-actions patient-profile-actions">
                <button type="submit" disabled={saving} className="doctor-action-button doctor-action-button-primary">
                  {saving ? "Salvando..." : "Salvar dados da clinica"}
                </button>
              </div>
            </section>
          </form>

          <section className="card doctor-record-card">
            <div className="doctor-record-header">
              <div>
                <span className="doctor-section-label">Resumo</span>
                <h2>Identificacao da clinica</h2>
                <p className="muted">Dados principais do vinculo institucional atual.</p>
              </div>
            </div>

            <div className="doctor-facts-grid">
              <article className="doctor-fact-card">
                <span className="doctor-fact-label">Clinica</span>
                <strong>{clinic?.clinicName ?? "-"}</strong>
                <small>ID {clinic?.clinicId ?? "-"}</small>
              </article>
              <article className="doctor-fact-card">
                <span className="doctor-fact-label">Codigo de entrada</span>
                <strong>{clinic?.joinCode ?? "-"}</strong>
                <small>Compartilhe com medico e paciente</small>
              </article>
              <article className="doctor-fact-card">
                <span className="doctor-fact-label">CNPJ</span>
                <strong>{clinic?.cnpj ? formatCnpj(clinic.cnpj) : "Nao informado"}</strong>
                <small>Mantenha este dado atualizado</small>
              </article>
            </div>
          </section>
        </>
      )}

      {status && <p className="muted">{status}</p>}
    </main>
  );
}
