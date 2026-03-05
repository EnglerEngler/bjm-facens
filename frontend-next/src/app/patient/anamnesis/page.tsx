"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { apiRequest } from "@/lib/api-client";
import { anamnesisBlocks, shouldDisplayQuestion } from "@/lib/anamnesis-questionnaire";
import type { PatientAnamnesis } from "@/types/domain";

interface SaveOptions {
  complete: boolean;
}

export default function PatientAnamnesisPage() {
  useAuthRedirect();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const visibleQuestions = useMemo(
    () => anamnesisBlocks.flatMap((block) => block.questions.filter((question) => shouldDisplayQuestion(question, answers))),
    [answers],
  );
  const completedQuestions = useMemo(
    () => visibleQuestions.filter((question) => (answers[question.id] ?? "").trim().length > 0).length,
    [answers, visibleQuestions],
  );

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const payload = await apiRequest<PatientAnamnesis>("/patients/me/anamnesis");
        setAnswers(payload.answers ?? {});
        setIsCompleted(Boolean(payload.isCompleted));
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Falha ao carregar anamnese.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const saveAnamnesis = async ({ complete }: SaveOptions) => {
    const unanswered = visibleQuestions.filter((question) => !(answers[question.id] ?? "").trim()).length;
    if (complete && unanswered > 0) {
      setStatus(`Preencha todas as perguntas visíveis antes de finalizar. Faltam ${unanswered}.`);
      return;
    }

    try {
      setSaving(true);
      setStatus(null);
      const payload = await apiRequest<PatientAnamnesis>("/patients/me/anamnesis", {
        method: "PUT",
        body: JSON.stringify({ answers, isCompleted: complete }),
      });
      setIsCompleted(Boolean(payload.isCompleted));
      setStatus(complete ? "Anamnese finalizada e salva com sucesso." : "Rascunho salvo com sucesso.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Falha ao salvar anamnese.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main>
      <h1>Anamnese do Paciente</h1>
      <p className="muted">Preencha o roteiro completo para disponibilizar a anamnese ao médico.</p>
      {isCompleted && <p className="muted">Status atual: finalizada.</p>}

      {loading ? (
        <p>Carregando anamnese...</p>
      ) : (
        <>
          <section className="card">
            <p>
              Progresso: {completedQuestions}/{visibleQuestions.length} perguntas respondidas.
            </p>
            <div className="row">
              <button type="button" disabled={saving} onClick={() => void saveAnamnesis({ complete: false })}>
                {saving ? "Salvando..." : "Salvar rascunho"}
              </button>
              <button type="button" disabled={saving} onClick={() => void saveAnamnesis({ complete: true })}>
                {saving ? "Salvando..." : "Finalizar anamnese"}
              </button>
            </div>
            {status && <p className="muted">{status}</p>}
          </section>

          {anamnesisBlocks.map((block) => (
            <section key={block.id} className="card">
              <h3>{block.title}</h3>
              {block.questions
                .filter((question) => shouldDisplayQuestion(question, answers))
                .map((question) => (
                  <label key={question.id}>
                    {question.prompt}
                    <textarea
                      rows={2}
                      value={answers[question.id] ?? ""}
                      onChange={(event) =>
                        setAnswers((previous) => ({
                          ...previous,
                          [question.id]: event.target.value,
                        }))
                      }
                    />
                  </label>
                ))}
            </section>
          ))}
        </>
      )}
    </main>
  );
}
