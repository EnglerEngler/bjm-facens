"use client";

export const dynamic = "force-dynamic";

import { AccountOnboardingForm } from "@/components/account-onboarding-form";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";

export default function AdminOnboardingPage() {
  useAuthRedirect({ allowIncompleteOnboarding: true });

  return (
    <AccountOnboardingForm
      role="admin"
      title="Configure seu perfil inicial"
      description="Revise os dados da conta administrativa antes de acessar os painéis internos."
    />
  );
}
