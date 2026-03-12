"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { apiRequest } from "@/lib/api-client";
import { anamnesisBlocks, shouldDisplayQuestion } from "@/lib/anamnesis-questionnaire";
import type { Patient, PatientAnamnesis } from "@/types/domain";

const parseDecimal = (value: string) => {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const calculateBodyMassIndex = (heightValue: string, weightValue: string) => {
  const weight = parseDecimal(weightValue);
  const heightRaw = parseDecimal(heightValue);
  if (!weight || !heightRaw) return "";

  const height = heightRaw > 3 ? heightRaw / 100 : heightRaw;
  if (height <= 0) return "";

  const bmi = weight / (height * height);
  if (!Number.isFinite(bmi)) return "";

  return bmi.toFixed(1).replace(".", ",");
};

const formatBiologicalSex = (value?: string | null) => {
  if (!value) return "Nao informado";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export default function PatientAnamnesisPage() {
  useAuthRedirect();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [patientProfile, setPatientProfile] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const bodyMassIndex = useMemo(() => calculateBodyMassIndex(answers.height ?? "", answers.weight ?? ""), [answers.height, answers.weight]);

  const visibleQuestions = useMemo(
    () =>
      anamnesisBlocks.flatMap((block) =>
        block.questions.filter((question) => !question.readOnly && shouldDisplayQuestion(question, answers)),
      ),
    [answers],
  );
  const completedQuestions = useMemo(
    () => visibleQuestions.filter((question) => (answers[question.id] ?? "").trim().length > 0).length,
    [answers, visibleQuestions],
  );
  const progressPercentage = visibleQuestions.length ? Math.round((completedQuestions / visibleQuestions.length) * 100) : 0;

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const [payload, profile] = await Promise.all([
          apiRequest<PatientAnamnesis>("/patients/me/anamnesis"),
          apiRequest<Patient>("/patients/me/profile"),
        ]);
        const biologicalSex = profile.biologicalSex ?? "";
        setPatientProfile(profile);
        setAnswers({
          ...(payload.answers ?? {}),
          ...(biologicalSex ? { biological_sex: biologicalSex } : {}),
        });
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Falha ao carregar anamnese.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const saveAnamnesis = async () => {
    try {
      setSaving(true);
      setStatus(null);
      const payload = await apiRequest<PatientAnamnesis>("/patients/me/anamnesis", {
        method: "PUT",
        body: JSON.stringify({
          answers: {
            ...answers,
            ...(bodyMassIndex ? { body_mass_index: bodyMassIndex } : {}),
            ...(patientProfile?.biologicalSex ? { biological_sex: patientProfile.biologicalSex } : {}),
          },
        }),
      });
      setAnswers(payload.answers ?? {});
      setStatus("Anamnese atualizada com sucesso.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Falha ao salvar anamnese.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="doctor-dashboard">
      <section className="doctor-hero patient-anamnesis-hero">
        <div>
          <span className="doctor-kicker">Minha anamnese</span>
          <h1>Historico de saude do paciente</h1>
          <p className="muted">Mantenha suas informacoes clinicas organizadas. O medico consulta este registro diretamente no prontuario.</p>
        </div>
      </section>

      {loading ? (
        <p>Carregando anamnese...</p>
      ) : (
        <>
          <section className="card doctor-record-card">
            <div className="doctor-record-header">
              <div>
                <span className="doctor-section-label">Resumo</span>
                <h2>Visao geral da anamnese</h2>
                <p className="muted">Um unico cadastro editavel, organizado por blocos clinicos.</p>
              </div>
            </div>

            <div className="doctor-facts-grid">
              <article className="doctor-fact-card">
                <span className="doctor-fact-label">Perguntas respondidas</span>
                <strong>
                  {completedQuestions}/{visibleQuestions.length}
                </strong>
                <small>{progressPercentage}% do roteiro preenchido</small>
              </article>
              <article className="doctor-fact-card">
                <span className="doctor-fact-label">Sexo biologico</span>
                <strong>{formatBiologicalSex(patientProfile?.biologicalSex)}</strong>
                <small>Vem do perfil do paciente</small>
              </article>
              <article className="doctor-fact-card">
                <span className="doctor-fact-label">IMC atual</span>
                <strong>{bodyMassIndex || "Aguardando altura e peso"}</strong>
                <small>Calculado automaticamente</small>
              </article>
            </div>

            <div className="patient-anamnesis-progress">
              <div className="patient-anamnesis-progress-bar">
                <span style={{ width: `${progressPercentage}%` }} />
              </div>
            </div>

            {status && <p className="muted">{status}</p>}
          </section>

          <div className="doctor-anamnesis-sections">
            {anamnesisBlocks.map((block) => {
              const blockQuestions = block.questions.filter((question) => shouldDisplayQuestion(question, answers));

              if (!blockQuestions.length) return null;

              return (
                <section key={block.id} className="card doctor-record-card">
                  <div className="doctor-record-header">
                    <div>
                      <h2>{block.title}</h2>
                    </div>
                  </div>

                  <div className="patient-anamnesis-grid">
                    {blockQuestions.map((question) => (
                      <label
                        key={question.id}
                        className={`patient-anamnesis-field ${question.readOnly ? "patient-anamnesis-field-readonly" : ""} ${question.inputType === "text" ? "patient-anamnesis-field-compact" : ""}`}
                      >
                        <span>{question.prompt}</span>
                        {question.readOnly ? (
                          <div className="patient-anamnesis-readonly-value">
                            {question.id === "body_mass_index" ? bodyMassIndex || "Aguardando altura e peso" : answers[question.id] ?? ""}
                          </div>
                        ) : question.inputType === "text" ? (
                          <input
                            value={answers[question.id] ?? ""}
                            onChange={(event) =>
                              setAnswers((previous) => ({
                                ...previous,
                                [question.id]: event.target.value,
                              }))
                            }
                          />
                        ) : (
                          <textarea
                            rows={4}
                            value={answers[question.id] ?? ""}
                            onChange={(event) =>
                              setAnswers((previous) => ({
                                ...previous,
                                [question.id]: event.target.value,
                              }))
                            }
                          />
                        )}
                      </label>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <section className="card doctor-record-card">
            <div className="patient-anamnesis-footer">
              <button type="button" className="doctor-action-button doctor-action-button-primary" disabled={saving || loading} onClick={() => void saveAnamnesis()}>
                {saving ? "Salvando..." : "Salvar Anamnese"}
              </button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
