import { Router } from "express";
import { z } from "zod";
import {
  DoctorDecisionModel,
  PatientModel,
  PrescriptionItemModel,
  PrescriptionModel,
  RiskAlertModel,
} from "../db/models/index.js";
import { authMiddleware, requireRole } from "../middleware/auth-middleware.js";
import { runClinicalAnalysis } from "../services/analysis-service.js";
import { addAuditLog } from "../services/audit-service.js";
import { createId } from "../utils/id.js";
import { HttpError } from "../utils/http-error.js";

const prescriptionItemSchema = z.object({
  medication: z.string().min(2),
  dose: z.string().min(1),
  frequency: z.string().min(1),
  duration: z.string().min(1),
  route: z.string().min(1),
});

const createPrescriptionSchema = z.object({
  patientId: z.string().min(1),
  conduct: z.string().optional(),
  items: z.array(prescriptionItemSchema).min(1),
});

const updatePrescriptionSchema = z.object({
  conduct: z.string().optional(),
  items: z.array(prescriptionItemSchema).min(1).optional(),
  status: z.enum(["draft", "active"]).optional(),
});

const decisionSchema = z.object({
  action: z.enum(["accepted", "reviewed", "ignored"]),
  justification: z.string().min(5).optional(),
});

export const prescriptionRoutes = Router();

prescriptionRoutes.use(authMiddleware, requireRole("doctor", "admin"));

prescriptionRoutes.post("/", async (req, res, next) => {
  try {
    const payload = createPrescriptionSchema.parse(req.body);
    const patient = await PatientModel.findByPk(payload.patientId);
    if (!patient) throw new HttpError("Paciente nao encontrado.", 404);

    const prescription = await PrescriptionModel.create({
      id: createId("rx"),
      doctorId: req.auth!.userId,
      patientId: payload.patientId,
      conduct: payload.conduct,
      status: "active",
      createdAt: new Date(),
    });

    await PrescriptionItemModel.bulkCreate(
      payload.items.map((item) => ({
        prescriptionId: prescription.id,
        medication: item.medication,
        dose: item.dose,
        frequency: item.frequency,
        duration: item.duration,
        route: item.route,
      })),
    );

    addAuditLog({
      actorUserId: req.auth!.userId,
      action: "prescription.create",
      resource: "prescriptions",
      resourceId: prescription.id,
      ip: req.ip,
    });

    res.status(201).json(prescription);
  } catch (error) {
    next(error);
  }
});

prescriptionRoutes.get("/", async (req, res, next) => {
  try {
    const patientId = req.query.patientId?.toString();
    const doctorId = req.query.doctorId?.toString();

    const where: Record<string, string> = {};
    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;

    const items = await PrescriptionModel.findAll({
      where,
      include: [{ model: PrescriptionItemModel, as: "items" }],
      order: [["createdAt", "DESC"]],
    });

    res.json(items);
  } catch (error) {
    next(error);
  }
});

prescriptionRoutes.get("/:prescriptionId", async (req, res, next) => {
  try {
    const prescriptionId = String(req.params.prescriptionId);
    const prescription = await PrescriptionModel.findByPk(prescriptionId, {
      include: [{ model: PrescriptionItemModel, as: "items" }],
    });

    if (!prescription) throw new HttpError("Prescricao nao encontrada.", 404);
    res.json(prescription);
  } catch (error) {
    next(error);
  }
});

prescriptionRoutes.patch("/:prescriptionId", async (req, res, next) => {
  try {
    const prescriptionId = String(req.params.prescriptionId);
    const payload = updatePrescriptionSchema.parse(req.body);
    const prescription = await PrescriptionModel.findByPk(prescriptionId);
    if (!prescription) throw new HttpError("Prescricao nao encontrada.", 404);
    if (prescription.status === "cancelled") {
      throw new HttpError("Prescricao cancelada nao pode ser editada.", 409);
    }

    if (payload.conduct !== undefined) prescription.conduct = payload.conduct;
    if (payload.status) prescription.status = payload.status;
    prescription.updatedAt = new Date();
    await prescription.save();

    if (payload.items) {
      await PrescriptionItemModel.destroy({ where: { prescriptionId: prescription.id } });
      await PrescriptionItemModel.bulkCreate(
        payload.items.map((item) => ({
          prescriptionId: prescription.id,
          medication: item.medication,
          dose: item.dose,
          frequency: item.frequency,
          duration: item.duration,
          route: item.route,
        })),
      );
    }

    addAuditLog({
      actorUserId: req.auth!.userId,
      action: "prescription.update",
      resource: "prescriptions",
      resourceId: prescription.id,
      ip: req.ip,
      metadata: { fields: Object.keys(payload) },
    });

    res.json(prescription);
  } catch (error) {
    next(error);
  }
});

prescriptionRoutes.post("/:prescriptionId/analyze", async (req, res, next) => {
  try {
    const prescriptionId = String(req.params.prescriptionId);
    const result = await runClinicalAnalysis(prescriptionId);
    addAuditLog({
      actorUserId: req.auth!.userId,
      action: "prescription.analyze",
      resource: "prescriptions",
      resourceId: prescriptionId,
      ip: req.ip,
      metadata: { highestSeverity: result.highestSeverity, alerts: result.alerts.length },
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

prescriptionRoutes.get("/:prescriptionId/alerts", async (req, res, next) => {
  try {
    const prescriptionId = String(req.params.prescriptionId);
    const alerts = await RiskAlertModel.findAll({
      where: { prescriptionId },
      order: [["createdAt", "DESC"]],
    });
    res.json(alerts);
  } catch (error) {
    next(error);
  }
});

prescriptionRoutes.post("/alerts/:alertId/decision", async (req, res, next) => {
  try {
    const alertId = String(req.params.alertId);
    const payload = decisionSchema.parse(req.body);
    const alert = await RiskAlertModel.findByPk(alertId);
    if (!alert) throw new HttpError("Alerta nao encontrado.", 404);

    if (alert.severity === "critical" && !payload.justification) {
      throw new HttpError("Alerta critico exige justificativa.", 422);
    }

    alert.status = payload.action;
    await alert.save();

    const decision = await DoctorDecisionModel.create({
      id: createId("decision"),
      alertId: alert.id,
      doctorId: req.auth!.userId,
      action: payload.action,
      justification: payload.justification,
      createdAt: new Date(),
    });

    addAuditLog({
      actorUserId: req.auth!.userId,
      action: "alert.decision",
      resource: "risk_alerts",
      resourceId: alert.id,
      ip: req.ip,
      metadata: {
        action: payload.action,
        severity: alert.severity,
      },
    });

    res.status(201).json({ alert, decision });
  } catch (error) {
    next(error);
  }
});

prescriptionRoutes.delete("/:prescriptionId", async (req, res, next) => {
  try {
    const prescriptionId = String(req.params.prescriptionId);
    const prescription = await PrescriptionModel.findByPk(prescriptionId);
    if (!prescription) throw new HttpError("Prescricao nao encontrada.", 404);

    prescription.status = "cancelled";
    prescription.cancelledAt = new Date();
    prescription.updatedAt = prescription.cancelledAt;
    await prescription.save();

    addAuditLog({
      actorUserId: req.auth!.userId,
      action: "prescription.cancel",
      resource: "prescriptions",
      resourceId: prescription.id,
      ip: req.ip,
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
