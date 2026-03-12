import { Router } from "express";
import { AuditLogModel, PatientModel, PrescriptionModel, RiskAlertModel, UserModel } from "../db/models/index.js";
import { authMiddleware, requireRole } from "../middleware/auth-middleware.js";

export const auditRoutes = Router();

auditRoutes.use(authMiddleware, requireRole("doctor", "admin", "clinic_admin"));

auditRoutes.get("/", async (req, res, next) => {
  const limit = Number(req.query.limit ?? 100);
  try {
    const entries = await AuditLogModel.findAll({
      include: [{ model: UserModel, as: "actor", attributes: ["id", "name", "email", "clinicId"], required: false }],
      order: [["createdAt", "DESC"]],
      limit,
    });

    const filteredEntries =
      req.auth?.role === "admin"
        ? entries
        : entries.filter((entry) => {
      const actor = entry.get("actor") as UserModel | undefined;
      return actor?.clinicId && actor.clinicId === req.auth?.clinicId;
    });

    const patientIds = new Set<string>();
    const prescriptionIds = new Set<string>();
    const alertIds = new Set<string>();

    filteredEntries.forEach((entry) => {
      if (!entry.resourceId) return;
      if (entry.resource === "patients" || entry.resource === "patient_anamneses" || entry.resource === "medical_records") {
        patientIds.add(entry.resourceId);
      }
      if (entry.resource === "prescriptions") {
        prescriptionIds.add(entry.resourceId);
      }
      if (entry.resource === "risk_alerts") {
        alertIds.add(entry.resourceId);
      }
    });

    const prescriptions = prescriptionIds.size
      ? await PrescriptionModel.findAll({ where: { id: Array.from(prescriptionIds) } })
      : [];
    prescriptions.forEach((prescription) => patientIds.add(prescription.patientId));

    const alerts = alertIds.size ? await RiskAlertModel.findAll({ where: { id: Array.from(alertIds) } }) : [];
    alerts.forEach((alert) => patientIds.add(alert.patientId));

    const patients = patientIds.size
      ? await PatientModel.findAll({
          where: { id: Array.from(patientIds) },
          include: [{ model: UserModel, as: "user", attributes: ["name"], required: false }],
        })
      : [];

    const patientNameById = new Map(
      patients.map((patient) => [patient.id, ((patient.get("user") as UserModel | undefined)?.name ?? null) as string | null]),
    );
    const patientIdByPrescriptionId = new Map(prescriptions.map((prescription) => [prescription.id, prescription.patientId]));
    const patientIdByAlertId = new Map(alerts.map((alert) => [alert.id, alert.patientId]));

    const enriched = filteredEntries.map((entry) => {
      const actor = entry.get("actor") as UserModel | undefined;
      const base = entry.toJSON() as Record<string, unknown>;

      let patientId: string | null = null;
      if (entry.resource === "patients" || entry.resource === "patient_anamneses" || entry.resource === "medical_records") {
        patientId = entry.resourceId;
      } else if (entry.resource === "prescriptions" && entry.resourceId) {
        patientId = patientIdByPrescriptionId.get(entry.resourceId) ?? null;
      } else if (entry.resource === "risk_alerts" && entry.resourceId) {
        patientId = patientIdByAlertId.get(entry.resourceId) ?? null;
      }

      return {
        ...base,
        actorName: actor?.name ?? null,
        actorEmail: actor?.email ?? null,
        patientId,
        patientName: patientId ? patientNameById.get(patientId) ?? null : null,
      };
    });

    res.json(enriched);
  } catch (error) {
    next(error);
  }
});
