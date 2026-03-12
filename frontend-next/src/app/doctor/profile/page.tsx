"use client";

export const dynamic = "force-dynamic";

import { AccountProfilePage } from "@/components/account-profile-page";

export default function DoctorProfilePage() {
  return (
    <AccountProfilePage
      role="doctor"
      title="Perfil do medico"
      description="Edite os dados da sua conta e mantenha seu acesso profissional atualizado."
    />
  );
}
