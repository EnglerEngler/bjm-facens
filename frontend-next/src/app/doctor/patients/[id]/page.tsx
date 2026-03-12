"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api-client";
import { anamnesisBlocks, shouldDisplayQuestion } from "@/lib/anamnesis-questionnaire";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import type { MedicalRecord, MedicalRecordHistoryEntry, Patient, PatientAnamnesis } from "@/types/domain";

interface PatientRecordPayload {
  patient: Patient;
  record: MedicalRecord;
}

interface PatientAnamnesisPayload {
  patient: Patient;
  anamnesis: PatientAnamnesis;
}

const formatDate = (value?: string | null) => {
  if (!value) return "Nao informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Nao informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
};

const joinValues = (values: string[]) => (values.length ? values.join(", ") : "Nenhum registro");

export default function DoctorPatientRecordPage() {
  useAuthRedirect();

  const params = useParams<{ id: string }>();
  const patientId = params.id;

  const [payload, setPayload] = useState<PatientRecordPayload | null>(null);
  const [history, setHistory] = useState<MedicalRecordHistoryEntry[]>([]);
  const [anamnesisPayload, setAnamnesisPayload] = useState<PatientAnamnesisPayload | null>(null);
  const [anamnesisError, setAnamnesisError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        setAnamnesisError(null);

        const [record, recordHistory] = await Promise.all([
          apiRequest<PatientRecordPayload>(`/patients/${patientId}/record`),
          apiRequest<MedicalRecordHistoryEntry[]>(`/patients/${patientId}/record/history`),
        ]);

        setPayload(record);
        setHistory(recordHistory);

        try {
          const anamnesis = await apiRequest<PatientAnamnesisPayload>(`/patients/${patientId}/anamnesis`);
          setAnamnesisPayload(anamnesis);
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            setAnamnesisPayload(null);
            setAnamnesisError("Anamnese ainda nao preenchida.");
          } else {
            setAnamnesisPayload(null);
            setAnamnesisError(err instanceof Error ? err.message : "Falha ao carregar anamnese.");
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao abrir prontuario.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [patientId]);

  const answeredSections = useMemo(() => {
    if (!anamnesisPayload) return [];

    return anamnesisBlocks
      .map((block) => {
        const answers = block.questions
          .filter((question) => shouldDisplayQuestion(question, anamnesisPayload.anamnesis.answers))
          .map((question) => ({
            id: question.id,
            prompt: question.prompt,
            answer: anamnesisPayload.anamnesis.answers[question.id]?.trim() ?? "",
          }))
          .filter((item) => item.answer);

        return { id: block.id, title: block.title, answers };
      })
      .filter((block) => block.answers.length > 0);
  }, [anamnesisPayload]);

  const answeredCount = Object.values(anamnesisPayload?.anamnesis.answers ?? {}).filter((value) => value.trim()).length;

  return (
    <main className="doctor-dashboard">
      <section className="doctor-hero">
        <div>
          <span className="doctor-kicker">Prontuario do paciente</span>
          <h1>{payload?.patient.id ?? patientId}</h1>
          <p className="muted">Informacoes do paciente, anamnese preenchida e historico recente em um unico fluxo.</p>
        </div>
        <div className="doctor-hero-actions">
          <Link href="/doctor/dashboard" className="doctor-action-button doctor-action-button-primary">
            Voltar para busca
          </Link>
          <Link href={`/doctor/prescriptions/new?patientId=${patientId}`} className="doctor-action-button doctor-action-button-primary">
            Nova prescricao
          </Link>
        </div>
      </section>

      {loading && <p>Carregando prontuario...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && payload && (
        <>
          <section className="card doctor-record-card">
            <div className="doctor-record-header">
              <div>
                <span className="doctor-section-label">Resumo do paciente</span>
                <h2>Dados principais</h2>
                <p className="muted">Base clinica para revisar o contexto antes da conduta e da prescricao.</p>
              </div>
            </div>

            <div className="doctor-facts-grid">
              <article className="doctor-fact-card">
                <span className="doctor-fact-label">Perfil do paciente</span>
                <strong>{payload.patient.id}</strong>
                <small>Usuario {payload.patient.userId}</small>
              </article>
              <article className="doctor-fact-card">
                <span className="doctor-fact-label">Nascimento</span>
                <strong>{formatDate(payload.patient.birthDate)}</strong>
                <small>Clinica {payload.patient.clinicId ?? "Nao informada"}</small>
              </article>
              <article className="doctor-fact-card">
                <span className="doctor-fact-label">Ultima atualizacao</span>
                <strong>{formatDateTime(payload.record.lastUpdatedAt)}</strong>
                <small>Prontuario ativo</small>
              </article>
            </div>

            <div className="doctor-clinical-grid">
              <article className="doctor-info-panel">
                <h3>Alergias</h3>
                <p>{joinValues(payload.record.allergies)}</p>
              </article>
              <article className="doctor-info-panel">
                <h3>Condicoes</h3>
                <p>{joinValues(payload.record.conditions)}</p>
              </article>
              <article className="doctor-info-panel">
                <h3>Medicamentos em uso</h3>
                <p>{joinValues(payload.record.currentMedications)}</p>
              </article>
            </div>
          </section>

          <section className="card doctor-record-card">
            <div className="doctor-record-header">
              <div>
                <span className="doctor-section-label">Anamnese</span>
                <h2>Resumo clinico preenchido pelo paciente</h2>
                <p className="muted">As respostas aparecem agrupadas e prontas para consulta rapida.</p>
              </div>
              <Link href={`/doctor/patients/${patientId}/anamnesis`} className="doctor-action-button doctor-action-button-primary">
                Ver anamnese completa
              </Link>
            </div>

            {anamnesisError && <p className="muted">{anamnesisError}</p>}

            {anamnesisPayload && (
              <>
                <div className="doctor-facts-grid">
                  <article className="doctor-fact-card">
                    <span className="doctor-fact-label">Anamnese</span>
                    <strong>Registro unico do paciente</strong>
                    <small>{answeredCount} resposta(s) preenchida(s)</small>
                  </article>
                  <article className="doctor-fact-card">
                    <span className="doctor-fact-label">Atualizacao</span>
                    <strong>{formatDateTime(anamnesisPayload.anamnesis.updatedAt)}</strong>
                    <small>Versao {anamnesisPayload.anamnesis.formVersion}</small>
                  </article>
                </div>

                <div className="doctor-anamnesis-sections">
                  {answeredSections.map((section) => (
                    <article key={section.id} className="doctor-anamnesis-card">
                      <h3>{section.title}</h3>
                      <dl>
                        {section.answers.map((item) => (
                          <div key={item.id} className="doctor-anamnesis-item">
                            <dt>{item.prompt}</dt>
                            <dd>{item.answer}</dd>
                          </div>
                        ))}
                      </dl>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="card doctor-record-card">
            <div className="doctor-record-header">
              <div>
                <span className="doctor-section-label">Historico</span>
                <h2>Alteracoes do prontuario</h2>
                <p className="muted">Ultimos registros de modificacao para auditoria e acompanhamento.</p>
              </div>
            </div>

            {history.length === 0 ? (
              <p className="muted">Sem alteracoes registradas.</p>
            ) : (
              <div className="doctor-history-list">
                {history.map((entry) => (
                  <article key={entry.id} className="doctor-history-item">
                    <strong>{formatDateTime(entry.createdAt)}</strong>
                    <p className="muted">Alterado por {entry.changedByUserId}</p>
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
