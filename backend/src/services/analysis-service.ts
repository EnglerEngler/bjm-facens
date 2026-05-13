import {
  AIAssessmentModel,
  MedicalRecordModel,
  PrescriptionItemModel,
  PrescriptionModel,
  RiskAlertModel,
} from "../db/models/index.js";
import type { AlertSeverity } from "../domain/types.js";
import { generateAssessmentSummary, loadClinicalContext } from "./gemini-clinical-service.js";
import { createId } from "../utils/id.js";
import { HttpError } from "../utils/http-error.js";

const normalize = (value: string) => value.trim().toLowerCase();

const severityOrder: Record<AlertSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const pickMostSevere = (current: AlertSeverity, next: AlertSeverity) =>
  severityOrder[next] > severityOrder[current] ? next : current;

const interactionPairs: Array<{
  a: string;
  b: string;
  severity: AlertSeverity;
  message: string;
}> = [
  {
    a: "sildenafil",
    b: "nitrato",
    severity: "critical",
    message: "Interação grave entre sildenafil e nitrato (risco de hipotensão severa).",
  },
  {
    a: "varfarina",
    b: "diclofenaco",
    severity: "high",
    message: "Interação relevante entre varfarina e diclofenaco (risco de sangramento).",
  },
];

const conditionMedicationRules: Array<{
  condition: string;
  medication: string;
  severity: AlertSeverity;
  message: string;
}> = [
  {
    condition: "hipertensão",
    medication: "pseudoefedrina",
    severity: "high",
    message: "Pseudoefedrina pode agravar hipertensão não controlada.",
  },
  {
    condition: "diabetes",
    medication: "prednisona",
    severity: "medium",
    message: "Prednisona pode elevar glicemia em paciente com diabetes.",
  },
];

const ensureAlert = async (params: {
  prescriptionId: string;
  patientId: string;
  ruleCode: string;
  severity: AlertSeverity;
  message: string;
  evidence: string[];
}) => {
  const existing = await RiskAlertModel.findOne({
    where: {
      prescriptionId: params.prescriptionId,
      ruleCode: params.ruleCode,
      message: params.message,
    },
  });

  if (existing) return existing;

  return RiskAlertModel.create({
    id: createId("alert"),
    status: "open",
    createdAt: new Date(),
    ...params,
  });
};

const ensureAIAssessment = async (params: {
  prescriptionId: string;
  patientId: string;
  items: Array<{ medication: string; dose: string; frequency: string; duration: string; route: string }>;
  record: { allergies: string[]; conditions: string[]; currentMedications: string[] };
}) => {
  const existing = await AIAssessmentModel.findOne({ where: { prescriptionId: params.prescriptionId } });
  if (existing) return existing;

  const context = await loadClinicalContext(params.patientId);
  const assessment = await generateAssessmentSummary(context, params.items);

  return AIAssessmentModel.create({
    id: createId("ai"),
    patientId: params.patientId,
    prescriptionId: params.prescriptionId,
    inputSnapshot: {
      prescriptionItems: params.items,
      medicalRecord: params.record,
    },
    outputSummary: {
      summary: assessment.summary,
      highlights: assessment.highlights,
      limitations: assessment.limitations,
    },
    promptVersion: "anamnesis-v2",
    modelVersion: assessment.modelVersion,
    createdAt: new Date(),
  });
};

export const runClinicalAnalysis = async (prescriptionId: string) => {
  const prescription = await PrescriptionModel.findByPk(prescriptionId);
  if (!prescription) throw new HttpError("Prescrição não encontrada.", 404);
  if (prescription.status === "cancelled") {
    throw new HttpError("Não é possível analisar prescrição cancelada.", 409);
  }

  const [recordModel, itemModels] = await Promise.all([
    MedicalRecordModel.findByPk(prescription.patientId),
    PrescriptionItemModel.findAll({ where: { prescriptionId: prescription.id } }),
  ]);

  if (itemModels.length === 0) throw new HttpError("Prescrição sem itens para análise.", 422);

  const record = {
    allergies: recordModel?.allergies ?? [],
    conditions: recordModel?.conditions ?? [],
    currentMedications: recordModel?.currentMedications ?? [],
  };

  const items = itemModels.map((item) => ({
    medication: item.medication,
    dose: item.dose,
    frequency: item.frequency,
    duration: item.duration,
    route: item.route,
  }));

  let highestSeverity: AlertSeverity = "low";

  for (const item of items) {
    const med = normalize(item.medication);

    if (record.allergies.some((allergy) => normalize(allergy) === med)) {
      await ensureAlert({
        prescriptionId: prescription.id,
        patientId: prescription.patientId,
        ruleCode: "ALLERGY_BLOCK",
        severity: "critical",
        message: `Alergia severa registrada para ${item.medication}.`,
        evidence: [`allergy:${item.medication}`],
      });
      highestSeverity = pickMostSevere(highestSeverity, "critical");
    }

    if (record.currentMedications.some((current) => normalize(current) === med)) {
      await ensureAlert({
        prescriptionId: prescription.id,
        patientId: prescription.patientId,
        ruleCode: "THERAPEUTIC_DUPLICITY",
        severity: "high",
        message: `Possível duplicidade terapêutica: ${item.medication} já em uso.`,
        evidence: [`currentMedication:${item.medication}`],
      });
      highestSeverity = pickMostSevere(highestSeverity, "high");
    }

    const duplicates = items.filter((p) => normalize(p.medication) === med).length;
    if (duplicates > 1) {
      await ensureAlert({
        prescriptionId: prescription.id,
        patientId: prescription.patientId,
        ruleCode: "PRESCRIPTION_DUPLICITY",
        severity: "medium",
        message: `Medicamento repetido na mesma prescrição: ${item.medication}.`,
        evidence: [`prescriptionDuplicate:${item.medication}`],
      });
      highestSeverity = pickMostSevere(highestSeverity, "medium");
    }
  }

  const prescribedMeds = items.map((item) => normalize(item.medication));
  const contextMeds = [...prescribedMeds, ...record.currentMedications.map((item) => normalize(item))];
  const uniqueContextMeds = [...new Set(contextMeds)];

  for (const rule of interactionPairs) {
    const hasA = uniqueContextMeds.some((med) => med.includes(normalize(rule.a)) || normalize(rule.a).includes(med));
    const hasB = uniqueContextMeds.some((med) => med.includes(normalize(rule.b)) || normalize(rule.b).includes(med));
    if (hasA && hasB) {
      await ensureAlert({
        prescriptionId: prescription.id,
        patientId: prescription.patientId,
        ruleCode: "MED_INTERACTION",
        severity: rule.severity,
        message: rule.message,
        evidence: [`interaction:${rule.a}+${rule.b}`],
      });
      highestSeverity = pickMostSevere(highestSeverity, rule.severity);
    }
  }

  for (const rule of conditionMedicationRules) {
    const hasCondition = record.conditions.some((condition) => normalize(condition) === normalize(rule.condition));
    const hasMedication = prescribedMeds.some(
      (med) => med.includes(normalize(rule.medication)) || normalize(rule.medication).includes(med),
    );

    if (hasCondition && hasMedication) {
      await ensureAlert({
        prescriptionId: prescription.id,
        patientId: prescription.patientId,
        ruleCode: "COMORBIDITY_RISK",
        severity: rule.severity,
        message: rule.message,
        evidence: [`condition:${rule.condition}`, `medication:${rule.medication}`],
      });
      highestSeverity = pickMostSevere(highestSeverity, rule.severity);
    }
  }

  prescription.analyzedAt = new Date();
  await prescription.save();

  const [alerts, aiAssessment] = await Promise.all([
    RiskAlertModel.findAll({ where: { prescriptionId: prescription.id } }),
    ensureAIAssessment({
      prescriptionId: prescription.id,
      patientId: prescription.patientId,
      items,
      record,
    }),
  ]);

  return {
    prescriptionId: prescription.id,
    analyzedAt: prescription.analyzedAt,
    highestSeverity: alerts.length > 0 ? highestSeverity : null,
    alerts,
    aiAssessment,
  };
};

export const getAnamnesisByPrescription = async (prescriptionId: string) => {
  const prescription = await PrescriptionModel.findByPk(prescriptionId);
  if (!prescription) throw new HttpError("Prescrição não encontrada.", 404);

  const existing = await AIAssessmentModel.findOne({ where: { prescriptionId } });
  if (existing) return existing;

  const [recordModel, itemModels] = await Promise.all([
    MedicalRecordModel.findByPk(prescription.patientId),
    PrescriptionItemModel.findAll({ where: { prescriptionId } }),
  ]);

  const assessment = await ensureAIAssessment({
    prescriptionId,
    patientId: prescription.patientId,
    items: itemModels.map((item) => ({
      medication: item.medication,
      dose: item.dose,
      frequency: item.frequency,
      duration: item.duration,
      route: item.route,
    })),
    record: {
      allergies: recordModel?.allergies ?? [],
      conditions: recordModel?.conditions ?? [],
      currentMedications: recordModel?.currentMedications ?? [],
    },
  });

  return assessment;
};
