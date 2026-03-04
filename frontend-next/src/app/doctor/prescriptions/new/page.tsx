"use client";

export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PrescriptionForm } from "@/components/prescription-form";
import { apiRequest } from "@/lib/api-client";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import type { Prescription, PrescriptionItem } from "@/types/domain";

export default function NewPrescriptionPage() {
  useAuthRedirect();

  const router = useRouter();
  const [defaultPatientId, setDefaultPatientId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const patientId = new URLSearchParams(window.location.search).get("patientId") ?? undefined;
    setDefaultPatientId(patientId);
  }, []);

  const submit = async (payload: { patientId: string; conduct?: string; items: PrescriptionItem[] }) => {
    const prescription = await apiRequest<Prescription>("/prescriptions", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    await apiRequest(`/prescriptions/${prescription.id}/analyze`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    router.push(`/doctor/prescriptions/${prescription.id}`);
  };

  return (
    <main>
      <h1>Nova Prescrição</h1>
      <p className="muted">Preencha medicamento, dose, frequência, duração e via.</p>
      <PrescriptionForm defaultPatientId={defaultPatientId} onSubmit={submit} />
    </main>
  );
}
