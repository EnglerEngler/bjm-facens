"use client";

export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PrescriptionForm } from "@/components/prescription-form";
import { ApiError, apiRequest } from "@/lib/api-client";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import type { AssistedPrescriptionDraft, Prescription, PrescriptionItem } from "@/types/domain";

export default function NewPrescriptionPage() {
  useAuthRedirect();

  const router = useRouter();
  const [defaultPatientId, setDefaultPatientId] = useState<string | undefined>(undefined);
  const [aiDraft, setAiDraft] = useState<AssistedPrescriptionDraft | null>(null);
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [aiDraftError, setAiDraftError] = useState<string | null>(null);

  useEffect(() => {
    const patientId = new URLSearchParams(window.location.search).get("patientId") ?? undefined;
    setDefaultPatientId(patientId);
  }, []);

  useEffect(() => {
    if (!defaultPatientId) {
      setAiDraft(null);
      setAiDraftError(null);
      setAiDraftLoading(false);
      return;
    }

    const run = async () => {
      try {
        setAiDraftLoading(true);
        setAiDraftError(null);
        const draft = await apiRequest<AssistedPrescriptionDraft>(`/ai/prescription-draft/${defaultPatientId}`);
        setAiDraft(draft);
      } catch (err) {
        setAiDraft(null);
        if (err instanceof ApiError && err.status === 404) {
          setAiDraftError("Paciente nao encontrado para gerar o rascunho assistido.");
        } else {
          setAiDraftError(err instanceof Error ? err.message : "Falha ao gerar sugestao inicial com IA.");
        }
      } finally {
        setAiDraftLoading(false);
      }
    };

    void run();
  }, [defaultPatientId]);

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
      <p className="muted">Revise a sugestao inicial da IA e ajuste medicamento, dose, frequencia, duracao e via antes de salvar.</p>
      <PrescriptionForm
        defaultPatientId={defaultPatientId}
        aiDraft={aiDraft}
        aiDraftLoading={aiDraftLoading}
        aiDraftError={aiDraftError}
        onSubmit={submit}
      />
    </main>
  );
}
