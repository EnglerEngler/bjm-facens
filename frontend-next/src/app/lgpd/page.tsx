"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { useAuth } from "@/providers/auth-provider";
import type { User } from "@/types/domain";

export default function LgpdPage() {
  useAuthRedirect({ allowPendingLgpd: true });

  const { session, logout, updateSessionUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptTerms = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const updatedUser = await apiRequest<User>("/auth/me/lgpd-acceptance", {
        method: "POST",
      });
      updateSessionUser(updatedUser);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao registrar aceite LGPD.");
    } finally {
      setSubmitting(false);
    }
  };

  const declineTerms = () => {
    logout();
  };

  return (
    <main className="login-main lgpd-main">
      <div className="login-backdrop" aria-hidden="true" />
      <section className="login-layout lgpd-layout">
        <aside className="login-hero lgpd-hero">
          <Link href="/login" className="login-brand login-hero-brand" aria-label="BJM">
            <Image src="/logo-bjm.png" alt="BJM" width={1362} height={630} priority className="login-brand-logo" />
          </Link>
          <h1>
            Consentimento LGPD para <span>seguir no acesso.</span>
          </h1>
          <p>
            Precisamos do seu aceite para tratar dados pessoais e dados sensíveis de saúde dentro da plataforma. Sem
            esse consentimento, o acesso permanece bloqueado.
          </p>
          <div className="login-feature-list" aria-label="Resumo do consentimento">
            <span>Dados clínicos protegidos</span>
            <span>Uso restrito ao cuidado</span>
            <span>Rastreabilidade de acesso</span>
          </div>
        </aside>

        <section className="login-panel">
          <div className="card login-form-card lgpd-card">
            <div className="login-form-header">
              <h2>Termo de consentimento</h2>
              <p>{session ? `${session.user.name}, revise e confirme para continuar.` : "Revise e confirme para continuar."}</p>
            </div>

            <div className="lgpd-content">
              <p>
                Ao aceitar, você declara ciência sobre a coleta, armazenamento e tratamento dos dados necessários para
                autenticação, operação da conta e execução das funcionalidades clínicas da plataforma.
              </p>
              <p>
                O acesso e o uso das informações ficam restritos aos perfis autorizados, com registro de auditoria para
                rastreabilidade e segurança operacional.
              </p>
              <p>
                Caso não aceite, sua sessão será encerrada e o sistema não liberará navegação para áreas internas.
              </p>
            </div>

            <div className="patient-onboarding-actions lgpd-actions">
              <button type="button" className="login-action-btn login-action-btn-secondary" onClick={declineTerms} disabled={submitting}>
                Não aceito
              </button>
              <button type="button" className="login-action-btn login-action-btn-primary" onClick={acceptTerms} disabled={submitting}>
                {submitting ? "Registrando..." : "Aceito e quero continuar"}
              </button>
            </div>

            {error && <p className="error login-form-error">{error}</p>}
          </div>
        </section>
      </section>
    </main>
  );
}
