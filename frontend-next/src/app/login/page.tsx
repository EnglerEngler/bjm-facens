"use client";

export const dynamic = "force-dynamic";

import { LoginForm } from "@/components/login-form";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";

export default function LoginPage() {
  useAuthRedirect();

  return (
    <main className="login-main">
      <div className="login-backdrop" aria-hidden="true" />
      <section className="login-layout">
        <aside className="login-hero">
          <p className="login-chip">Plataforma Clínica Inteligente</p>
          <h1>Tecnologia clínica para decisões médicas mais seguras.</h1>
          <p>
            Fluxo visual inspirado no seu modelo, com dados clínicos centralizados, rastreabilidade e suporte para
            decisões em tempo real.
          </p>
          <a href="#painel-login" className="login-cta">
            Como funciona
          </a>
        </aside>
        <section className="login-panel" id="painel-login">
          <LoginForm />
        </section>
      </section>
    </main>
  );
}
