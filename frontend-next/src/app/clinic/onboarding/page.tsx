"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { pushFlashToast } from "@/lib/flash-toast";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { useAuth } from "@/providers/auth-provider";
import type { ClinicProfile, User } from "@/types/domain";

const digitsOnly = (value: string) => value.replace(/\D/g, "");

const formatCnpj = (value: string) => {
  const digits = digitsOnly(value).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

export default function ClinicOnboardingPage() {
  useAuthRedirect({ allowIncompleteOnboarding: true });

  const router = useRouter();
  const { session, updateSessionUser } = useAuth();
  const [form, setForm] = useState({ clinicName: "", cnpj: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setStatus(null);
        const clinic = await apiRequest<ClinicProfile>("/auth/me/clinic");
        setForm({
          clinicName: clinic.clinicName,
          cnpj: formatCnpj(clinic.cnpj ?? ""),
        });
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Falha ao carregar dados da clínica.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session) return;

    try {
      setSaving(true);
      setStatus(null);
      const [updatedClinic, updatedUser] = await Promise.all([
        apiRequest<ClinicProfile>("/auth/me/clinic", {
          method: "PUT",
          body: JSON.stringify({
            clinicName: form.clinicName,
            cnpj: digitsOnly(form.cnpj),
          }),
        }),
        apiRequest<User>("/auth/me/onboarding", {
          method: "PUT",
          body: JSON.stringify({
            name: session.user.name,
            email: session.user.email,
          }),
        }),
      ]);

      updateSessionUser(updatedUser);
      setForm({
        clinicName: updatedClinic.clinicName,
        cnpj: formatCnpj(updatedClinic.cnpj ?? ""),
      });
      pushFlashToast("Clínica configurada com sucesso.");
      router.push("/clinic/dashboard");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao concluir onboarding da clínica.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="doctor-dashboard">
      <section className="doctor-hero clinic-hero">
        <div>
          <span className="doctor-kicker">Onboarding da clínica</span>
          <h1>Finalize os dados institucionais</h1>
          <p className="muted">Antes de administrar equipe e pacientes, confirme os dados principais da sua clínica.</p>
        </div>
      </section>

      {loading ? (
        <p>Carregando dados da clínica...</p>
      ) : (
        <>
          <form className="patient-onboarding-form" onSubmit={submit}>
            <section className="card doctor-record-card">
              <div className="doctor-record-header">
                <div>
                  <span className="doctor-section-label">Clínica</span>
                  <h2>Nome da clínica e CNPJ</h2>
                  <p className="muted">Esses dados representam a sua operação dentro da plataforma.</p>
                </div>
              </div>

              <section className="doctor-anamnesis-card">
                <div className="patient-onboarding-grid">
                  <label>
                    Nome da clínica
                    <input
                      value={form.clinicName}
                      onChange={(event) => setForm((current) => ({ ...current, clinicName: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    CNPJ
                    <input
                      value={form.cnpj}
                      onChange={(event) => setForm((current) => ({ ...current, cnpj: formatCnpj(event.target.value) }))}
                      inputMode="numeric"
                      maxLength={18}
                      placeholder="00.000.000/0000-00"
                      required
                    />
                  </label>
                </div>
              </section>

              <div className="patient-onboarding-actions">
                <button type="submit" disabled={saving} className="doctor-action-button doctor-action-button-primary">
                  {saving ? "Salvando..." : "Continuar"}
                </button>
              </div>
            </section>
          </form>

          {status && <p className="muted">{status}</p>}
        </>
      )}
    </main>
  );
}
