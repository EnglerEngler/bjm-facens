import { Router } from "express";
import { DoctorModel, PatientModel } from "../db/models/index.js";
import { authMiddleware, requireRole } from "../middleware/auth-middleware.js";
import { generatePrescriptionDraft } from "../services/gemini-clinical-service.js";
import { getAnamnesisByPrescription } from "../services/analysis-service.js";
import { addAuditLog } from "../services/audit-service.js";
import { HttpError } from "../utils/http-error.js";

export const aiRoutes = Router();

aiRoutes.use(authMiddleware, requireRole("doctor", "admin"));

const ensureDoctorClinicAccess = async (req: Express.Request, patientId: string) => {
  if (req.auth?.role === "admin") return;

  const doctor = await DoctorModel.findOne({ where: { userId: req.auth?.userId } });
  if (!doctor) throw new HttpError("Perfil de médico não encontrado.", 403);

  const patient = await PatientModel.findByPk(patientId);
  if (!patient) throw new HttpError("Paciente não encontrado.", 404);
  if (!doctor.clinicId || !patient.clinicId || patient.clinicId !== doctor.clinicId) {
    throw new HttpError("Paciente deve pertencer à mesma clínica do médico.", 403);
  }
};

aiRoutes.get("/prescription-draft/:patientId", async (req, res, next) => {
  try {
    const patientId = String(req.params.patientId);
    await ensureDoctorClinicAccess(req, patientId);
    const draft = await generatePrescriptionDraft(patientId);

    addAuditLog({
      actorUserId: req.auth!.userId,
      action: "ai.prescription_draft.read",
      resource: "patients",
      resourceId: patientId,
      ip: req.ip,
      metadata: { modelVersion: draft.modelVersion },
    });

    res.json(draft);
  } catch (error) {
    next(error);
  }
});

aiRoutes.get("/anamnesis/:prescriptionId", async (req, res, next) => {
  try {
    const assessment = await getAnamnesisByPrescription(req.params.prescriptionId);
    addAuditLog({
      actorUserId: req.auth!.userId,
      action: "ai.anamnesis.read",
      resource: "ai_assessments",
      resourceId: assessment?.id,
      ip: req.ip,
      metadata: { prescriptionId: req.params.prescriptionId },
    });
    res.json(assessment);
  } catch (error) {
    next(error);
  }
});
