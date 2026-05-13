"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { pushFlashToast } from "@/lib/flash-toast";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { roleDefaultPath } from "@/lib/role-utils";
import { useAuth } from "@/providers/auth-provider";
import type { ClinicProfile, User, UserRole } from "@/types/domain";

interface AccountProfilePageProps {
  role: UserRole;
  title: string;
  description: string;
}

export function AccountProfilePage({ role, title, description }: AccountProfilePageProps) {
  useAuthRedirect({ allowIncompleteOnboarding: true });

  const router = useRouter();
  const { session, updateSessionUser } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [clinic, setClinic] = useState<ClinicProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      name: session?.user.name ?? "",
      email: session?.user.email ?? "",
      password: "",
    });
  }, [session?.user.email, session?.user.name]);

  useEffect(() => {
    const run = async () => {
      if (!session?.user) {
        setClinic(null);
        return;
      }

      try {
        const payload = await apiRequest<ClinicProfile>("/auth/me/clinic");
        setClinic(payload);
      } catch {
        setClinic(null);
      }
    };

    void run();
  }, [session?.user]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setSaving(true);
      setStatus(null);
      const updatedUser = await apiRequest<User>("/auth/me", {
        method: "PUT",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password || undefined,
        }),
      });
      updateSessionUser(updatedUser);
      setForm((current) => ({ ...current, password: "" }));
      pushFlashToast("Perfil atualizado com sucesso.");
      router.push(roleDefaultPath(role));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao atualizar perfil.");
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
      setStatus("Não foi possível copiar o código de entrada.");
    }
  };

  const roleLabel =
    role === "doctor" ? "Médico" : role === "admin" ? "Administrador" : role === "clinic_admin" ? "Admin da Clínica" : "Usuário";

  return (
    <main className="doctor-dashboard">
      <section className="doctor-hero">
        <div>
          <span className="doctor-kicker">Meu perfil</span>
          <h1>{title}</h1>
          <p className="muted">{description}</p>
        </div>
      </section>

      <form className="patient-onboarding-form" onSubmit={submit}>
        <section className="card doctor-record-card">
          <div className="doctor-record-header">
            <div>
              <span className="doctor-section-label">Conta</span>
              <h2>Nome, e-mail e senha</h2>
              <p className="muted">Edite os dados principais de acesso do seu perfil.</p>
            </div>
          </div>

          <section className="doctor-anamnesis-card">
            <div className="patient-onboarding-grid">
              <label>
                Nome
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
              </label>
              <label>
                E-mail
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </label>
              <label>
                Nova senha
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Preencha apenas se quiser alterar"
                />
              </label>
            </div>
          </section>

          <div className="patient-onboarding-actions patient-profile-actions">
            <button type="submit" disabled={saving} className="doctor-action-button doctor-action-button-primary">
              {saving ? "Salvando..." : "Salvar perfil"}
            </button>
          </div>
        </section>
      </form>

      <section className="card doctor-record-card">
        <div className="doctor-record-header">
          <div>
            <span className="doctor-section-label">Resumo</span>
            <h2>Dados do seu acesso</h2>
            <p className="muted">Informações principais do perfil autenticado neste momento.</p>
          </div>
        </div>

        <div className="doctor-facts-grid">
          <article className="doctor-fact-card">
            <span className="doctor-fact-label">Perfil</span>
            <strong>{roleLabel}</strong>
            <small>User ID {session?.user.id ?? "-"}</small>
          </article>
          <article className="doctor-fact-card">
            <span className="doctor-fact-label">E-mail atual</span>
            <strong>{session?.user.email ?? "-"}</strong>
            <small>Atualizado junto com a conta</small>
          </article>
          <article className="doctor-fact-card">
            <span className="doctor-fact-label">Código de entrada</span>
            <strong>{clinic?.joinCode ?? "-"}</strong>
            {clinic ? (
              <button type="button" className="doctor-action-button doctor-action-button-secondary" onClick={copyClinicJoinCode}>
                Copiar código
              </button>
            ) : (
              <small>Escopo atual do seu acesso</small>
            )}
          </article>
        </div>
      </section>

      {status && <p className="muted">{status}</p>}
    </main>
  );
}
