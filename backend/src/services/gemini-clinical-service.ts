import { env } from "../config/env.js";
import { MedicalRecordModel, PatientAnamnesisModel, PatientModel, UserModel } from "../db/models/index.js";
import { HttpError } from "../utils/http-error.js";

export interface SuggestedPrescriptionItem {
  medication: string;
  dose: string;
  frequency: string;
  duration: string;
  route: string;
}

export interface SuggestedPrescriptionDraft {
  patientName: string;
  summary: string;
  conduct: string;
  items: SuggestedPrescriptionItem[];
  modelVersion: string;
}

interface ClinicalContext {
  patient: {
    id: string;
    userId: string;
    name: string;
    clinicId: string | null;
    birthDate: string | null;
    biologicalSex: string | null;
  };
  record: {
    allergies: string[];
    conditions: string[];
    currentMedications: string[];
    lastUpdatedAt: string | null;
  };
  anamnesis: {
    answers: Record<string, string>;
    formVersion: string | null;
    updatedAt: string | null;
  } | null;
}

interface AssessmentSummary {
  summary: string;
  highlights: string[];
  limitations: string[];
  modelVersion: string;
}

const toNonEmptyString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const normalizeItem = (value: unknown): SuggestedPrescriptionItem | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const medication = toNonEmptyString(candidate.medication);
  const dose = toNonEmptyString(candidate.dose);
  const frequency = toNonEmptyString(candidate.frequency);
  const duration = toNonEmptyString(candidate.duration);
  const route = toNonEmptyString(candidate.route);

  if (!medication || !dose || !frequency || !duration || !route) return null;
  return { medication, dose, frequency, duration, route };
};

const stripCodeFence = (value: string) => value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

const parseJsonPayload = <T>(value: string): T | null => {
  try {
    return JSON.parse(stripCodeFence(value)) as T;
  } catch {
    return null;
  }
};

const extractJsonObject = (value: string) => {
  const cleaned = stripCodeFence(value);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return cleaned;
  return cleaned.slice(start, end + 1);
};

const summarizeAnamnesisAnswers = (answers: Record<string, string>) =>
  Object.entries(answers)
    .filter(([, value]) => typeof value === "string" && value.trim())
    .slice(0, 14)
    .map(([key, value]) => `${key}: ${value.trim()}`);

const buildContextPrompt = (context: ClinicalContext) => {
  const anamnesisLines = context.anamnesis ? summarizeAnamnesisAnswers(context.anamnesis.answers) : [];

  return [
    `Paciente: ${context.patient.name || context.patient.id}`,
    `Identificador: ${context.patient.id}`,
    `Nascimento: ${context.patient.birthDate || "nao informado"}`,
    `Sexo biologico: ${context.patient.biologicalSex || "nao informado"}`,
    `Condicoes registradas: ${context.record.conditions.join(", ") || "nenhuma"}`,
    `Alergias registradas: ${context.record.allergies.join(", ") || "nenhuma"}`,
    `Medicacoes em uso: ${context.record.currentMedications.join(", ") || "nenhuma"}`,
    `Ultima atualizacao do prontuario: ${context.record.lastUpdatedAt || "nao informado"}`,
    `Anamnese preenchida: ${context.anamnesis ? "sim" : "nao"}`,
    anamnesisLines.length > 0 ? `Principais respostas da anamnese:\n- ${anamnesisLines.join("\n- ")}` : "Sem respostas de anamnese.",
  ].join("\n");
};

const requestGroqJson = async <T>(prompt: string): Promise<T> => {
  if (!env.groqApiKey) {
    throw new HttpError("GROQ_API_KEY nao configurada no backend.", 503);
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.groqApiKey}`,
    },
    body: JSON.stringify({
      model: env.groqModel,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Voce e um assistente clinico para apoio a medico. Responda somente JSON valido, sem markdown. Seja conciso, use portugues do Brasil e nao invente dados ausentes.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new HttpError(`Groq retornou ${response.status}: ${errorText || "sem detalhe"}`, 503);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
      };
      finish_reason?: string | null;
    }>;
  };

  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new HttpError("Groq nao retornou texto utilizavel.", 503);
  }

  const parsed = parseJsonPayload<T>(text) ?? parseJsonPayload<T>(extractJsonObject(text));
  if (!parsed) {
    throw new HttpError(`Groq retornou JSON invalido: ${text.slice(0, 400)}`, 503);
  }

  return parsed;
};

export const loadClinicalContext = async (patientId: string): Promise<ClinicalContext> => {
  const patient = await PatientModel.findByPk(patientId);
  if (!patient) throw new HttpError("Paciente nao encontrado.", 404);

  const [user, record, anamnesis] = await Promise.all([
    UserModel.findByPk(patient.userId),
    MedicalRecordModel.findByPk(patient.id),
    PatientAnamnesisModel.findByPk(patient.id),
  ]);

  return {
    patient: {
      id: patient.id,
      userId: patient.userId,
      name: user?.name ?? "",
      clinicId: patient.clinicId ?? null,
      birthDate: patient.birthDate ? String(patient.birthDate) : null,
      biologicalSex: patient.biologicalSex ?? null,
    },
    record: {
      allergies: record?.allergies ?? [],
      conditions: record?.conditions ?? [],
      currentMedications: record?.currentMedications ?? [],
      lastUpdatedAt: record?.lastUpdatedAt ? String(record.lastUpdatedAt) : null,
    },
    anamnesis: anamnesis
      ? {
          answers: anamnesis.answers,
          formVersion: anamnesis.formVersion,
          updatedAt: anamnesis.updatedAt ? String(anamnesis.updatedAt) : null,
        }
      : null,
  };
};

export const generateAssessmentSummary = async (
  context: ClinicalContext,
  items: SuggestedPrescriptionItem[],
): Promise<AssessmentSummary> => {
  const prompt = [
    "Gere um resumo clinico estruturado para revisao medica a partir do contexto abaixo.",
    "Responda apenas em JSON com o formato:",
    '{"summary":"string","highlights":["string"],"limitations":["string"]}',
    "Regras:",
    "- maximo 2 highlights",
    "- maximo 2 limitations",
    "- nao use markdown",
    "- nao afirmar diagnostico definitivo",
    "- considerar os medicamentos sugeridos/prescritos no contexto",
    buildContextPrompt(context),
    `Itens da prescricao: ${items.length ? JSON.stringify(items) : "nenhum item informado"}`,
  ].join("\n\n");

  const parsed = await requestGroqJson<{
    summary?: unknown;
    highlights?: unknown;
    limitations?: unknown;
  }>(prompt);

  const summary = toNonEmptyString(parsed?.summary);
  const highlights = Array.isArray(parsed?.highlights) ? parsed!.highlights.map(toNonEmptyString).filter(Boolean).slice(0, 2) : [];
  const limitations = Array.isArray(parsed?.limitations)
    ? parsed!.limitations.map(toNonEmptyString).filter(Boolean).slice(0, 2)
    : [];

  if (!summary || highlights.length === 0 || limitations.length === 0) {
    throw new HttpError("Groq respondeu, mas o resumo clinico veio incompleto.", 503);
  }

  return {
    summary,
    highlights,
    limitations,
    modelVersion: env.groqModel,
  };
};

export const generatePrescriptionDraft = async (patientId: string): Promise<SuggestedPrescriptionDraft> => {
  const context = await loadClinicalContext(patientId);
  const hasAnamnesisAnswers = Object.values(context.anamnesis?.answers ?? {}).some((value) => value.trim());

  if (!context.anamnesis || !hasAnamnesisAnswers) {
    throw new HttpError("Paciente ainda nao possui anamnese preenchida. Preencha a anamnese para gerar sugestao com IA.", 422);
  }

  const prompt = [
    "Voce vai sugerir um rascunho inicial de prescricao para um medico.",
    "Responda apenas em JSON com o formato:",
    '{"summary":"string","conduct":"string","items":[{"medication":"string","dose":"string","frequency":"string","duration":"string","route":"string"}]}',
    "Regras:",
    "- maximo 3 medicamentos",
    "- escreva a conduta de forma objetiva e prescritiva",
    "- nao repetir medicacoes ja registradas em uso sem justificativa implicita",
    "- nao sugerir medicamentos que coincidam com alergias registradas",
    "- route deve ser algo como oral, topica, intramuscular",
    "- nao use markdown",
    "- nao escreva avisos para revisar manualmente; entregue a melhor proposta clinica inicial com base nos dados fornecidos",
    buildContextPrompt(context),
  ].join("\n\n");

  const parsed = await requestGroqJson<{
    summary?: unknown;
    conduct?: unknown;
    items?: unknown;
  }>(prompt);

  const summary = toNonEmptyString(parsed?.summary);
  const conduct = toNonEmptyString(parsed?.conduct);
  const items = Array.isArray(parsed?.items) ? parsed!.items.map(normalizeItem).filter(Boolean) as SuggestedPrescriptionItem[] : [];

  if (!summary || !conduct || items.length === 0) {
    throw new HttpError("Groq respondeu, mas o rascunho da prescricao veio incompleto.", 503);
  }

  return {
    patientName: context.patient.name || context.patient.id,
    summary,
    conduct,
    items,
    modelVersion: env.groqModel,
  };
};
