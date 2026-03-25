"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const parsed = schema.safeParse({ patientId, conduct, items });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }

    try {
      setLoading(true);
      await onSubmit(parsed.data);
      setSuccess("Prescrição enviada com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar prescrição.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="card" onSubmit={submit}>
      <h3>Nova Prescrição</h3>
      {aiDraftLoading && <p className="muted">Gerando sugestao inicial com IA...</p>}

      {aiDraft && (
        <section className="card">
          <h4>Resumo assistido por IA</h4>
          <p>{aiDraft.summary}</p>
        </section>
      )}

      {aiDraftError && <p className="error">{aiDraftError}</p>}

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
                />
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
    </form>
  );
}
