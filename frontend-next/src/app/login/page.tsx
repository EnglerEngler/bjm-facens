"use client";

export const dynamic = "force-dynamic";

import { LoginForm } from "@/components/login-form";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  useAuthRedirect();

  return (
    <main className="login-main">
      <div className="login-backdrop" aria-hidden="true" />
      <Link href="/como-funciona" className="login-corner-link">
        Como funciona
      </Link>
      <section className="login-layout">
        <aside className="login-hero">
          <Link href="/login" className="login-brand login-hero-brand" aria-label="BJM">
            <Image src="/logo-bjm.png" alt="BJM" width={1362} height={630} priority className="login-brand-logo" />
          </Link>
          <h1>
            Tecnologia clínica para decisões médicas <span>mais seguras.</span>
          </h1>
          <p>
            Fluxo visual inspirado no seu modelo, com dados clínicos centralizados, rastreabilidade e suporte para
            decisões em tempo real.
          </p>
          <div className="login-feature-list" aria-label="Recursos principais">
            <span>Medicina integrativa</span>
            <span>Prontuário integrado</span>
            <span>Acompanhamento contínuo</span>
          </div>
        </aside>
        <section className="login-panel" id="painel-login">
          <LoginForm />
        </section>
      </section>
    </main>
  );
}
