"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { z } from "zod";
import { commonMedicationNames } from "@/lib/medications";
import type { AssistedPrescriptionDraft, PrescriptionItem } from "@/types/domain";

const itemSchema = z.object({
  medication: z.string().min(2, "Medicamento deve ter pelo menos 2 caracteres."),
  dose: z.string().min(1, "Dose é obrigatória."),
  frequency: z.string().min(1, "Frequência é obrigatória."),
  duration: z.string().min(1, "Duração é obrigatória."),
  route: z.string().min(1, "Via é obrigatória."),
});

const schema = z.object({
  patientId: z.string().min(1, "Paciente é obrigatório."),
  conduct: z.string().optional(),
  items: z.array(itemSchema).min(1, "Informe ao menos um item."),
});

interface Props {
  defaultPatientId?: string;
  aiDraft?: AssistedPrescriptionDraft | null;
  aiDraftLoading?: boolean;
  aiDraftError?: string | null;
  onSubmit: (payload: { patientId: string; conduct?: string; items: PrescriptionItem[] }) => Promise<void>;
}

const emptyItem: PrescriptionItem = {
  medication: "",
  dose: "",
  frequency: "",
  duration: "",
  route: "oral",
};

export function PrescriptionForm({ defaultPatientId, aiDraft, aiDraftLoading, aiDraftError, onSubmit }: Props) {
  const [patientId, setPatientId] = useState(defaultPatientId ?? "");
  const [conduct, setConduct] = useState("");
  const [items, setItems] = useState<PrescriptionItem[]>([{ ...emptyItem }]);
  const [pendingSubmission, setPendingSubmission] = useState<{ patientId: string; conduct?: string; items: PrescriptionItem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPatientId(defaultPatientId ?? "");
  }, [defaultPatientId]);

  useEffect(() => {
    if (!aiDraft) return;
    setConduct(aiDraft.conduct);
    setItems(aiDraft.items.length > 0 ? aiDraft.items : [{ ...emptyItem }]);
  }, [aiDraft]);

  const updateItem = (index: number, field: keyof PrescriptionItem, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addItem = () => setItems((prev) => [...prev, { ...emptyItem }]);

  const removeItem = (index: number) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
  };

  const medicationSuggestions = Array.from(
    new Set([
      ...commonMedicationNames,
      ...items.map((item) => item.medication.trim()).filter(Boolean),
      ...(aiDraft?.items.map((item) => item.medication.trim()).filter(Boolean) ?? []),
    ]),
  ).sort((a, b) => a.localeCompare(b));

  const persistPrescription = async (payload: { patientId: string; conduct?: string; items: PrescriptionItem[] }) => {
    try {
      setLoading(true);
      await onSubmit(payload);
      setSuccess("Prescrição enviada com sucesso.");
      setPendingSubmission(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar prescrição.");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const parsed = schema.safeParse({ patientId, conduct, items });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }
    setPendingSubmission(parsed.data);
  };

  return (
    <form className="card" onSubmit={submit}>
      <h3>Nova Prescrição</h3>
      {aiDraftLoading && <p className="muted">Gerando sugestão inicial com IA...</p>}

      {aiDraft && (
        <section className="card">
          <h4>Resumo assistido por IA</h4>
          <p>{aiDraft.summary}</p>
        </section>
      )}

      {aiDraftError && (
        <section className={`form-inline-alert ${aiDraft ? "info" : "error"}`}>
          <strong>Rascunho assistido indisponível</strong>
          <span>{aiDraftError}</span>
          {!aiDraft && defaultPatientId && aiDraftError.toLowerCase().includes("anamnese") && (
            <Link href={`/doctor/patients/${defaultPatientId}/anamnesis`} className="doctor-inline-link">
              Abrir anamnese do paciente
            </Link>
          )}
        </section>
      )}

      {!defaultPatientId && (
        <label>
          ID do Paciente
          <input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="patient_123" />
        </label>
      )}

      <label>
        Conduta
        <textarea value={conduct} onChange={(e) => setConduct(e.target.value)} rows={3} />
      </label>

      <div className="grid">
        {items.map((item, index) => (
          <div key={`item-${index}`} className="card">
            <div className="between">
              <strong>Item {index + 1}</strong>
              <button type="button" onClick={() => removeItem(index)}>
                Remover
              </button>
            </div>
            <div className="grid grid-2">
              <label>
                Medicamento
                <input
                  value={item.medication}
                  onChange={(e) => updateItem(index, "medication", e.target.value)}
                  placeholder="Ex: Dipirona"
                  list={`medication-suggestions-${index}`}
                />
                <datalist id={`medication-suggestions-${index}`}>
                  {medicationSuggestions.map((medication) => (
                    <option key={`${index}-${medication}`} value={medication} />
                  ))}
                </datalist>
              </label>
              <label>
                Dose
                <input value={item.dose} onChange={(e) => updateItem(index, "dose", e.target.value)} placeholder="500mg" />
              </label>
              <label>
                Frequência
                <input
                  value={item.frequency}
                  onChange={(e) => updateItem(index, "frequency", e.target.value)}
                  placeholder="8/8h"
                />
              </label>
              <label>
                Duração
                <input
                  value={item.duration}
                  onChange={(e) => updateItem(index, "duration", e.target.value)}
                  placeholder="7 dias"
                />
              </label>
              <label>
                Via
                <input value={item.route} onChange={(e) => updateItem(index, "route", e.target.value)} placeholder="oral" />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="row">
        <button type="button" onClick={addItem}>
          Adicionar item
        </button>
        <button type="submit" disabled={loading}>
          {loading ? "Enviando..." : "Salvar prescrição"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      {pendingSubmission && (
        <div className="confirm-save-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-save-title">
          <div className="confirm-save-card">
            <h4 id="confirm-save-title">Confirmar antes de salvar</h4>
            <p className="muted">Revise a prescrição. Depois de salvar, a análise clínica será executada.</p>
            <ul className="confirm-save-list">
              <li>Paciente: {pendingSubmission.patientId}</li>
              <li>Itens: {pendingSubmission.items.length}</li>
              <li>Primeiro medicamento: {pendingSubmission.items[0]?.medication || "Não informado"}</li>
            </ul>
            <div className="row">
              <button type="button" onClick={() => setPendingSubmission(null)} disabled={loading}>
                Revisar
              </button>
              <button type="button" onClick={() => void persistPrescription(pendingSubmission)} disabled={loading}>
                {loading ? "Salvando..." : "Confirmar e salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
