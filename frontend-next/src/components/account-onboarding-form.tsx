"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { pushFlashToast } from "@/lib/flash-toast";
import { roleDefaultPath } from "@/lib/role-utils";
import { useAuth } from "@/providers/auth-provider";
import type { UserRole, User } from "@/types/domain";

interface AccountOnboardingFormProps {
  role: UserRole;
  title: string;
  description: string;
}

export function AccountOnboardingForm({ role, title, description }: AccountOnboardingFormProps) {
  const router = useRouter();
  const { session, updateSessionUser } = useAuth();
  const [name, setName] = useState(session?.user.name ?? "");
  const [email, setEmail] = useState(session?.user.email ?? "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setName(session?.user.name ?? "");
    setEmail(session?.user.email ?? "");
  }, [session?.user.name, session?.user.email]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setSaving(true);
      setStatus(null);
      const updatedUser = await apiRequest<User>("/auth/me/onboarding", {
        method: "PUT",
        body: JSON.stringify({ name, email }),
      });
      updateSessionUser(updatedUser);
      pushFlashToast("Perfil configurado com sucesso.");
      router.push(roleDefaultPath(role));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao concluir onboarding.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="doctor-dashboard">
      <section className="doctor-hero">
        <div>
          <span className="doctor-kicker">Onboarding</span>
          <h1>{title}</h1>
          <p className="muted">{description}</p>
        </div>
      </section>

      <form className="patient-onboarding-form" onSubmit={submit}>
        <section className="card doctor-record-card">
          <div className="doctor-record-header">
            <div>
              <span className="doctor-section-label">Conta</span>
              <h2>Revise seus dados</h2>
              <p className="muted">Confirme nome e e-mail antes de entrar na plataforma.</p>
            </div>
          </div>

          <section className="doctor-anamnesis-card">
            <div className="patient-onboarding-grid">
              <label>
                Nome
                <input value={name} onChange={(event) => setName(event.target.value)} required />
              </label>
              <label>
                E-mail
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
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
    </main>
  );
}
