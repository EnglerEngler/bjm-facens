"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api-client";
import { anamnesisBlocks, shouldDisplayQuestion } from "@/lib/anamnesis-questionnaire";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { formatCpf } from "@/lib/patient-fields";
import type { MedicalRecord, MedicalRecordHistoryEntry, Patient, PatientAnamnesis, Prescription } from "@/types/domain";

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

const getSortableTime = (value?: string | null) => {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export default function DoctorPatientRecordPage() {
  useAuthRedirect();

  const params = useParams<{ id: string }>();
  const patientId = params.id;

  const [payload, setPayload] = useState<PatientRecordPayload | null>(null);
  const [history, setHistory] = useState<MedicalRecordHistoryEntry[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [anamnesisPayload, setAnamnesisPayload] = useState<PatientAnamnesisPayload | null>(null);
  const [anamnesisError, setAnamnesisError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prescriptionSortOrder, setPrescriptionSortOrder] = useState<"desc" | "asc">("desc");
  const [historySortOrder, setHistorySortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        setAnamnesisError(null);

        const [record, recordHistory, patientPrescriptions] = await Promise.all([
          apiRequest<PatientRecordPayload>(`/patients/${patientId}/record`),
          apiRequest<MedicalRecordHistoryEntry[]>(`/patients/${patientId}/record/history`),
          apiRequest<Prescription[]>(`/prescriptions?patientId=${patientId}`),
        ]);

        setPayload(record);
        setHistory(recordHistory);
        setPrescriptions(patientPrescriptions);

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
  const patientDisplayName = payload?.patient.name?.trim() || anamnesisPayload?.patient.name?.trim() || patientId;
  const sortedPrescriptions = useMemo(
    () =>
      [...prescriptions].sort((a, b) => {
        const diff =
          prescriptionSortOrder === "desc"
            ? getSortableTime(b.createdAt) - getSortableTime(a.createdAt)
            : getSortableTime(a.createdAt) - getSortableTime(b.createdAt);

        return diff !== 0 ? diff : a.id.localeCompare(b.id);
      }),
    [prescriptions, prescriptionSortOrder],
  );
  const sortedHistory = useMemo(
    () =>
      [...history].sort((a, b) => {
        const diff =
          historySortOrder === "desc"
            ? getSortableTime(b.createdAt) - getSortableTime(a.createdAt)
            : getSortableTime(a.createdAt) - getSortableTime(b.createdAt);

        return diff !== 0 ? diff : a.id.localeCompare(b.id);
      }),
    [history, historySortOrder],
  );
  const hasStructuredRecord =
    Boolean(payload?.record.lastUpdatedAt) ||
    Boolean(payload?.record.allergies.length) ||
    Boolean(payload?.record.conditions.length) ||
    Boolean(payload?.record.currentMedications.length);

  return (
    <main className="doctor-dashboard">
      <section className="doctor-hero">
        <div>
          <span className="doctor-kicker">Revisao do paciente</span>
          <h1>{patientDisplayName}</h1>
          <p className="muted">Revise o contexto clinico e a anamnese antes de gerar uma nova prescricao.</p>
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
                <strong>{payload.patient.name?.trim() || payload.patient.id}</strong>
                <small>Usuario {payload.patient.userId}</small>
              </article>
              <article className="doctor-fact-card">
                <span className="doctor-fact-label">Nascimento</span>
                <strong>{formatDate(payload.patient.birthDate)}</strong>
                <small>
                  Clinica {payload.patient.clinicId ?? "Nao informada"}
                  {payload.patient.cpf ? ` · CPF ${formatCpf(payload.patient.cpf)}` : ""}
                </small>
              </article>
              <article className="doctor-fact-card">
                <span className="doctor-fact-label">Status do prontuario</span>
                <strong>{payload.record.lastUpdatedAt ? formatDateTime(payload.record.lastUpdatedAt) : "Sem prontuario salvo"}</strong>
                <small>{hasStructuredRecord ? "Dados clinicos disponiveis" : "Use a anamnese como base para a prescricao"}</small>
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
              {anamnesisPayload && (
                <Link href={`/doctor/patients/${patientId}/anamnesis`} className="doctor-action-button doctor-action-button-primary">
                  Ver anamnese completa
                </Link>
              )}
            </div>

            {anamnesisError && (
              <section className="doctor-empty-state doctor-empty-state-warning">
                <div>
                  <strong>Anamnese ainda nao preenchida</strong>
                  <p>Sem anamnese, a IA nao consegue gerar o rascunho inicial. A equipe pode seguir com prescricao manual enquanto aguarda o preenchimento.</p>
                </div>
                <div className="doctor-empty-state-actions">
                  <Link href={`/doctor/prescriptions/new?patientId=${patientId}`} className="doctor-action-button doctor-action-button-primary">
                    Criar prescricao manual
                  </Link>
                  <Link href={`/doctor/patients/${patientId}/anamnesis`} className="doctor-action-button doctor-action-button-secondary">
                    Ver tela da anamnese
                  </Link>
                </div>
              </section>
            )}

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
                <span className="doctor-section-label">Prescricoes</span>
                <h2>Historico de prescricoes</h2>
                <p className="muted">Consulte as prescricoes ja emitidas para este paciente antes de criar uma nova.</p>
              </div>
              <div className="doctor-record-header-actions">
                <span className="doctor-result-chip">
                  Ordem atual: {prescriptionSortOrder === "desc" ? "mais recente primeiro" : "mais antiga primeiro"}
                </span>
                <button
                  type="button"
                  className="doctor-action-button doctor-action-button-secondary"
                  onClick={() => setPrescriptionSortOrder((current) => (current === "desc" ? "asc" : "desc"))}
                >
                  Inverter ordem
                </button>
              </div>
            </div>

            {sortedPrescriptions.length === 0 ? (
              <p className="muted">Nenhuma prescricao registrada para este paciente.</p>
            ) : (
              <div className="doctor-history-list">
                {sortedPrescriptions.map((prescription) => (
                  <article key={prescription.id} className="doctor-history-item">
                    <strong>{formatDateTime(prescription.createdAt)}</strong>
                    {prescription.conduct && <p>{prescription.conduct}</p>}
                    <div className="doctor-history-actions">
                      <Link href={`/doctor/prescriptions/${prescription.id}`} className="doctor-action-button doctor-action-button-primary">
                        Ver detalhes da prescricao
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="card doctor-record-card">
            <div className="doctor-record-header">
              <div>
                <span className="doctor-section-label">Historico</span>
                <h2>Alteracoes do prontuario</h2>
                <p className="muted">Ultimos registros de modificacao para auditoria e acompanhamento.</p>
              </div>
              <div className="doctor-record-header-actions">
                <span className="doctor-result-chip">
                  Ordem atual: {historySortOrder === "desc" ? "mais recente primeiro" : "mais antiga primeiro"}
                </span>
                <button
                  type="button"
                  className="doctor-action-button doctor-action-button-secondary"
                  onClick={() => setHistorySortOrder((current) => (current === "desc" ? "asc" : "desc"))}
                >
                  Inverter ordem
                </button>
              </div>
            </div>

            {sortedHistory.length === 0 ? (
              <p className="muted">Sem alteracoes registradas. Se ainda nao houver prontuario estruturado, revise a anamnese e siga para a prescricao.</p>
            ) : (
              <div className="doctor-history-list">
                {sortedHistory.map((entry) => (
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
