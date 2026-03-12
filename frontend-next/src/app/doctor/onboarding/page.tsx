"use client";

export const dynamic = "force-dynamic";

import { AccountOnboardingForm } from "@/components/account-onboarding-form";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";

export default function DoctorOnboardingPage() {
  useAuthRedirect({ allowIncompleteOnboarding: true });

  return (
    <AccountOnboardingForm
      role="doctor"
      title="Complete seu acesso inicial"
      description="Antes de abrir o dashboard, revise os dados basicos da sua conta para deixar o perfil pronto."
    />
  );
}
