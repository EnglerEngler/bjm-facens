"use client";

export const dynamic = "force-dynamic";

import { AccountProfilePage } from "@/components/account-profile-page";

export default function AdminProfilePage() {
  return (
    <AccountProfilePage
      role="admin"
      title="Perfil do administrador"
      description="Edite os dados da sua conta administrativa e mantenha o acesso principal consistente."
    />
  );
}
