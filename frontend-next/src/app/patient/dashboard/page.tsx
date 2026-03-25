"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { apiRequest } from "@/lib/api-client";
import { anamnesisBlocks, shouldDisplayQuestion } from "@/lib/anamnesis-questionnaire";
import { loadPatientPrescriptions, type PatientPrescriptionView } from "@/lib/prescriptions-service";
import type { Patient, PatientAnamnesis } from "@/types/domain";

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
};

export default function PatientDashboardPage() {
  useAuthRedirect();

  const [prescriptions, setPrescriptions] = useState<PatientPrescriptionView[]>([]);
  const [anamnesis, setAnamnesis] = useState<PatientAnamnesis | null>(null);
  const [patientProfile, setPatientProfile] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const progressAnswers = {
    ...(anamnesis?.answers ?? {}),
    ...(patientProfile?.biologicalSex ? { biological_sex: patientProfile.biologicalSex } : {}),
  };

  const visibleQuestions = anamnesisBlocks.flatMap((block) =>
    block.questions.filter((question) => !question.readOnly && shouldDisplayQuestion(question, progressAnswers)),
  );
  const answeredQuestions = visibleQuestions.filter((question) => (anamnesis?.answers?.[question.id] ?? "").trim()).length;
  const progressPercentage = visibleQuestions.length ? Math.round((answeredQuestions / visibleQuestions.length) * 100) : 0;
  const hasAnyAnswer = Object.values(anamnesis?.answers ?? {}).some((value) => value.trim());

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const [data, patientAnamnesis, profile] = await Promise.all([
          loadPatientPrescriptions(),
          apiRequest<PatientAnamnesis>("/patients/me/anamnesis"),
          apiRequest<Patient>("/patients/me/profile"),
        ]);
        setPrescriptions(data.items);
        setAnamnesis(patientAnamnesis);
        setPatientProfile(profile);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar prescrições.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <main className="doctor-dashboard patient-dashboard">
      <section className="doctor-hero patient-dashboard-hero">
        <div>
          <span className="doctor-kicker">Area do paciente</span>
          <h1>Dashboard</h1>
          <p className="muted">Acompanhe sua anamnese e as prescricoes liberadas em um painel mais claro e organizado.</p>
        </div>
      </section>

      {loading && <p>Carregando prescrições...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <>
          <section className="card doctor-record-card">
            <div className="doctor-record-header">
              <div>
                <span className="doctor-section-label">Anamnese</span>
                <h2>Seu historico de saude</h2>
                <p className="muted">Este registro alimenta o prontuario consultado pelo medico.</p>
              </div>
            </div>

            <div className="doctor-facts-grid">
              <article className="doctor-fact-card">
                <span className="doctor-fact-label">Progresso da anamnese</span>
                <strong>{progressPercentage}%</strong>
                <small>
                  {answeredQuestions}/{visibleQuestions.length} perguntas respondidas
                </small>
              </article>
              <article className="doctor-fact-card">
                <span className="doctor-fact-label">Ultima atualizacao</span>
                <strong>{anamnesis?.updatedAt ? formatDate(anamnesis.updatedAt) : "Ainda nao preenchida"}</strong>
                <small>Voce pode atualizar quando quiser</small>
              </article>
            </div>

            <div className="patient-dashboard-empty-state">
              <div>
                <strong>{hasAnyAnswer ? "Anamnese pronta para edicao" : "Sua anamnese ainda esta vazia"}</strong>
                <p className="muted">
                  {hasAnyAnswer
                    ? "Revise ou complemente as informacoes clinicas antes da proxima consulta."
                    : "Preencha sua anamnese para manter o prontuario completo e ajudar o medico na avaliacao."}
                </p>
              </div>
              <Link href="/patient/anamnesis" className="doctor-action-button doctor-action-button-primary">
                {hasAnyAnswer ? "Editar Anamnese" : "Preencher Anamnese"}
              </Link>
            </div>
          </section>

          <section className="card doctor-record-card">
            <div className="doctor-record-header">
              <div>
                <span className="doctor-section-label">Prescricoes</span>
                <h2>Orientacoes liberadas</h2>
                <p className="muted">Lista das prescricoes disponiveis para consulta.</p>
              </div>
            </div>

            {prescriptions.length === 0 ? (
              <div className="patient-dashboard-empty-state">
                <div>
                  <strong>Nenhuma prescricao disponivel</strong>
                  <p className="muted">Quando houver uma nova prescricao liberada, ela aparecera aqui com as orientacoes correspondentes.</p>
                </div>
              </div>
            ) : (
              <div className="doctor-patient-list">
                {prescriptions.map((rx) => (
                  <article key={rx.id} className="doctor-patient-row patient-prescription-card">
                    <div className="doctor-patient-row-main">
                      <strong>Prescricao liberada em {formatDate(rx.createdAt)}</strong>
                      <p className="muted">{rx.orientation}</p>
                      {rx.items.length > 0 ? (
                        <div className="patient-prescription-items">
                          {rx.items.map((item, index) => (
                            <div key={`${rx.id}-${item.medication}-${index}`} className="patient-prescription-item">
                              <strong>{item.medication}</strong>
                              <p className="muted">
                                {item.dose} • {item.frequency} • {item.duration} • {item.route}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div className="patient-prescription-actions">
                        <Link href={`/patient/prescriptions/${rx.id}`} className="doctor-action-button doctor-action-button-primary">
                          Abrir prescricao
                        </Link>
                      </div>
                    </div>
                    <div className="doctor-patient-row-tags">
                      <span>{rx.items.length} item(ns)</span>
                      <span>Liberada</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
