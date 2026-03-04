"use client";

export const dynamic = "force-dynamic";

import { LoginForm } from "@/components/login-form";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";

export default function LoginPage() {
  useAuthRedirect();

  return (
    <main className="login-main">
      <section className="login-layout">
        <aside className="login-hero">
          <p className="login-chip">Plataforma Clínica Inteligente</p>
          <h1>Prescrição assistida com foco em segurança do paciente.</h1>
          <p>
            Analise riscos, contraindicações e histórico clínico em um fluxo orientado para decisões médicas seguras.
          </p>
          <ul>
            <li>Análise de alertas por severidade.</li>
            <li>Anamnese estruturada por IA com explicabilidade.</li>
            <li>Registro auditável de decisões clínicas.</li>
          </ul>
        </aside>
        <section className="login-panel">
          <LoginForm />
        </section>
      </section>
    </main>
  );
}
