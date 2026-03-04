"use client";

import { useState } from "react";
import type { RiskAlert } from "@/types/domain";

interface Props {
  alert: RiskAlert;
  onSubmit: (params: { action: "accepted" | "reviewed" | "ignored"; justification?: string }) => Promise<void>;
}

export function AlertDecisionForm({ alert, onSubmit }: Props) {
  const [justification, setJustification] = useState("");
  const [loadingAction, setLoadingAction] = useState<"accepted" | "reviewed" | "ignored" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: "accepted" | "reviewed" | "ignored") => {
    setError(null);

    if (alert.severity === "critical" && justification.trim().length < 5) {
      setError("Alerta crítico exige justificativa com pelo menos 5 caracteres.");
      return;
    }

    try {
      setLoadingAction(action);
      await onSubmit({ action, justification: justification.trim() || undefined });
      if (action !== "ignored") setJustification("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao registrar decisão.");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div>
      <label>
        Justificativa
        <textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          rows={2}
          placeholder="Obrigatória para alerta crítico"
        />
      </label>
      <div className="row">
        <button type="button" disabled={loadingAction !== null} onClick={() => void run("accepted")}>
          {loadingAction === "accepted" ? "Salvando..." : "Aceitar"}
        </button>
        <button type="button" disabled={loadingAction !== null} onClick={() => void run("reviewed")}>
          {loadingAction === "reviewed" ? "Salvando..." : "Revisar"}
        </button>
        <button type="button" disabled={loadingAction !== null} onClick={() => void run("ignored")}>
          {loadingAction === "ignored" ? "Salvando..." : "Ignorar"}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
