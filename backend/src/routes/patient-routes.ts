import { Router } from "express";
import { z } from "zod";
import { MedicalRecordHistoryModel, MedicalRecordModel, PatientModel, PrescriptionModel, PrescriptionItemModel } from "../db/models/index.js";
import { authMiddleware, requireRole } from "../middleware/auth-middleware.js";
import { addAuditLog } from "../services/audit-service.js";
import { createId } from "../utils/id.js";
import { HttpError } from "../utils/http-error.js";

const updateRecordSchema = z.object({
  allergies: z.array(z.string().min(2)).optional(),
  conditions: z.array(z.string().min(2)).optional(),
  currentMedications: z.array(z.string().min(2)).optional(),
});

const createPatientSchema = z.object({
  userId: z.string().min(1),
  doctorId: z.string().min(1).optional(),
  birthDate: z.string().min(8).optional(),
  record: z
    .object({
      allergies: z.array(z.string().min(2)).default([]),
      conditions: z.array(z.string().min(2)).default([]),
      currentMedications: z.array(z.string().min(2)).default([]),
    })
    .optional(),
});

export const patientRoutes = Router();

patientRoutes.use(authMiddleware);

patientRoutes.get("/me/prescriptions", requireRole("patient"), async (req, res, next) => {
  try {
    const patient = await PatientModel.findOne({
      where: { userId: req.auth!.userId },
    });
    if (!patient) throw new HttpError("Paciente nao encontrado para este usuario.", 404);

    const prescriptions = await PrescriptionModel.findAll({
      where: { patientId: patient.id },
      include: [{ model: PrescriptionItemModel, as: "items" }],
      order: [["createdAt", "DESC"]],
    });

    res.json(prescriptions);
  } catch (error) {
    next(error);
  }
});

patientRoutes.get("/", requireRole("doctor", "admin"), async (_req, res, next) => {
  try {
    const patients = await PatientModel.findAll();
    const records = await MedicalRecordModel.findAll();

    const items = patients.map((patient) => ({
      ...patient.toJSON(),
      record: records.find((mr) => mr.patientId === patient.id)?.toJSON() ?? null,
    }));
    res.json(items);
  } catch (error) {
    next(error);
  }
});

patientRoutes.post("/", requireRole("doctor", "admin"), async (req, res, next) => {
  try {
    const payload = createPatientSchema.parse(req.body);
    const patient = await PatientModel.create({
      id: createId("patient"),
      userId: payload.userId,
      doctorId: payload.doctorId,
      birthDate: payload.birthDate ? new Date(payload.birthDate) : null,
      createdAt: new Date(),
    });

    await MedicalRecordModel.create({
      patientId: patient.id,
      allergies: payload.record?.allergies ?? [],
      conditions: payload.record?.conditions ?? [],
      currentMedications: payload.record?.currentMedications ?? [],
      lastUpdatedAt: new Date(),
    });

    addAuditLog({
      actorUserId: req.auth!.userId,
      action: "patient.create",
      resource: "patients",
      resourceId: patient.id,
      ip: req.ip,
    });

    res.status(201).json(patient);
  } catch (error) {
    next(error);
  }
});

patientRoutes.get("/:patientId/record", requireRole("doctor", "admin", "patient"), async (req, res, next) => {
  try {
    const patientId = String(req.params.patientId);
    const patient = await PatientModel.findByPk(patientId);
    if (!patient) throw new HttpError("Paciente nao encontrado.", 404);

    if (req.auth?.role === "patient" && req.auth.userId !== patient.userId) {
      throw new HttpError("Paciente nao pode acessar prontuario de outro usuario.", 403);
    }

    const record = await MedicalRecordModel.findByPk(patientId);
    if (!record) throw new HttpError("Prontuario nao encontrado.", 404);

    res.json({ patient, record });
  } catch (error) {
    next(error);
  }
});

patientRoutes.patch("/:patientId/record", requireRole("doctor", "patient"), async (req, res, next) => {
  try {
    const patientId = String(req.params.patientId);
    const payload = updateRecordSchema.parse(req.body);
    const patient = await PatientModel.findByPk(patientId);
    if (!patient) throw new HttpError("Paciente nao encontrado.", 404);

    if (req.auth?.role === "patient" && req.auth.userId !== patient.userId) {
      throw new HttpError("Paciente nao pode alterar prontuario de outro usuario.", 403);
    }

    const record = await MedicalRecordModel.findByPk(patientId);
    if (!record) throw new HttpError("Prontuario nao encontrado.", 404);

    const before = record.toJSON();
    if (payload.allergies) record.allergies = payload.allergies;
    if (payload.conditions) record.conditions = payload.conditions;
    if (payload.currentMedications) record.currentMedications = payload.currentMedications;
    record.lastUpdatedAt = new Date();
    await record.save();

    await MedicalRecordHistoryModel.create({
      id: createId("mrh"),
      patientId: record.patientId,
      changedByUserId: req.auth!.userId,
      beforeSnapshot: before,
      afterSnapshot: record.toJSON(),
      createdAt: new Date(),
    });

    addAuditLog({
      actorUserId: req.auth!.userId,
      action: "medicalRecord.update",
      resource: "medical_records",
      resourceId: record.patientId,
      ip: req.ip,
      metadata: { fields: Object.keys(payload) },
    });

    res.json(record);
  } catch (error) {
    next(error);
  }
});

patientRoutes.get("/:patientId/record/history", requireRole("doctor", "admin"), async (req, res, next) => {
  try {
    const patientId = String(req.params.patientId);
    const entries = await MedicalRecordHistoryModel.findAll({
      where: { patientId },
      order: [["createdAt", "DESC"]],
    });
    res.json(entries);
  } catch (error) {
    next(error);
  }
});

patientRoutes.delete("/:patientId", requireRole("admin"), async (req, res, next) => {
  try {
    const patientId = String(req.params.patientId);
    const patient = await PatientModel.findByPk(patientId);
    if (!patient) throw new HttpError("Paciente nao encontrado.", 404);
    await patient.destroy();

    addAuditLog({
      actorUserId: req.auth!.userId,
      action: "patient.delete",
      resource: "patients",
      resourceId: patient.id,
      ip: req.ip,
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
