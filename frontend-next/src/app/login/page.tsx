"use client";

export const dynamic = "force-dynamic";

import { LoginForm } from "@/components/login-form";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";

export default function LoginPage() {
  useAuthRedirect();

  return (
    <main>
      <h1>Plataforma de Prescrição Assistida com IA</h1>
      <p className="muted">Acesse com seu perfil para continuar.</p>
      <LoginForm />
    </main>
  );
}
