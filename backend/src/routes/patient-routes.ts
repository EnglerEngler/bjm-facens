import { Router } from "express";
import { z } from "zod";
import {
  MedicalRecordHistoryModel,
  MedicalRecordModel,
  PatientAnamnesisModel,
  PatientModel,
  PrescriptionItemModel,
  PrescriptionModel,
  UserModel,
} from "../db/models/index.js";
import { authMiddleware, requireRole } from "../middleware/auth-middleware.js";
import { addAuditLog } from "../services/audit-service.js";
import { createId } from "../utils/id.js";
import { HttpError } from "../utils/http-error.js";
import { createSimplePdfBuffer } from "../utils/simple-pdf.js";

const updateRecordSchema = z.object({
  allergies: z.array(z.string().min(2)).optional(),
  conditions: z.array(z.string().min(2)).optional(),
  currentMedications: z.array(z.string().min(2)).optional(),
});

const normalizeCpf = (value: unknown) => (typeof value === "string" ? value.replace(/\D/g, "") : value);

const createPatientSchema = z.object({
  userId: z.string().min(1),
  birthDate: z.string().min(8).optional(),
  record: z
    .object({
      allergies: z.array(z.string().min(2)).default([]),
      conditions: z.array(z.string().min(2)).default([]),
      currentMedications: z.array(z.string().min(2)).default([]),
    })
    .optional(),
});

const upsertAnamnesisSchema = z.object({
  answers: z.record(z.string().max(2000)),
});

const parseDecimal = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const calculateBodyMassIndex = (heightValue?: string | null, weightValue?: string | null) => {
  const weight = parseDecimal(weightValue);
  const heightRaw = parseDecimal(heightValue);
  if (!weight || !heightRaw) return null;

  const height = heightRaw > 3 ? heightRaw / 100 : heightRaw;
  if (height <= 0) return null;

  const bmi = weight / (height * height);
  if (!Number.isFinite(bmi)) return null;

  return bmi.toFixed(1).replace(".", ",");
};

const optionalProfileText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().max(160).nullable(),
);

const digitsOnly = (value: unknown) => (typeof value === "string" ? value.replace(/\D/g, "") : value);

const upsertPatientProfileSchema = z.object({
  cpf: z.preprocess(normalizeCpf, z.string().regex(/^\d{11}$/)),
  birthDate: z.string().min(8),
  biologicalSex: z.enum(["masculino", "feminino"]),
  phone: z.preprocess(digitsOnly, z.string().regex(/^\d{10,11}$/)),
  addressZipCode: z.preprocess(digitsOnly, z.string().regex(/^\d{8}$/)),
  addressStreet: z.string().min(3).max(160),
  addressNumber: z.string().min(1).max(20),
  addressComplement: optionalProfileText.optional(),
  addressNeighborhood: z.string().min(2).max(120),
  addressCity: z.string().min(2).max(120),
  addressState: z.string().trim().regex(/^[A-Za-z]{2}$/),
  emergencyContactName: z.string().min(3).max(160),
  emergencyContactPhone: z.preprocess(digitsOnly, z.string().regex(/^\d{10,11}$/)),
});

export const patientRoutes = Router();

patientRoutes.use(authMiddleware);

const isPatientOnboardingComplete = (patient: PatientModel) =>
  Boolean(
    patient.birthDate &&
      patient.cpf &&
      patient.biologicalSex &&
      patient.phone &&
      patient.addressZipCode &&
      patient.addressStreet &&
      patient.addressNumber &&
      patient.addressNeighborhood &&
      patient.addressCity &&
      patient.addressState &&
      patient.emergencyContactName &&
      patient.emergencyContactPhone,
  );

const ensureClinicAccess = (req: Express.Request, patientClinicId?: string | null) => {
  if (!req.auth) throw new HttpError("Não autenticado.", 401);
  if (req.auth.role === "admin") return;
  if (!req.auth.clinicId) throw new HttpError("Usuário sem clínica vinculada.", 403);
  if (!patientClinicId || patientClinicId !== req.auth.clinicId) {
    throw new HttpError("Acesso permitido apenas para pacientes da mesma clínica.", 403);
  }
};

patientRoutes.get("/me/prescriptions", requireRole("patient"), async (req, res, next) => {
  try {
    const patient = await PatientModel.findOne({
      where: { userId: req.auth!.userId },
    });
    if (!patient) throw new HttpError("Paciente não encontrado para este usuário.", 404);

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

patientRoutes.get("/me/prescriptions/:prescriptionId", requireRole("patient"), async (req, res, next) => {
  try {
    const patient = await PatientModel.findOne({
      where: { userId: req.auth!.userId },
    });
    if (!patient) throw new HttpError("Paciente não encontrado para este usuário.", 404);

    const prescription = await PrescriptionModel.findOne({
      where: { id: String(req.params.prescriptionId), patientId: patient.id },
      include: [{ model: PrescriptionItemModel, as: "items" }],
    });

    if (!prescription) throw new HttpError("Prescrição não encontrada.", 404);

    res.json(prescription);
  } catch (error) {
    next(error);
  }
});

patientRoutes.get("/me/prescriptions/:prescriptionId/pdf", requireRole("patient"), async (req, res, next) => {
  try {
    const patient = await PatientModel.findOne({
      where: { userId: req.auth!.userId },
    });
    if (!patient) throw new HttpError("Paciente não encontrado para este usuário.", 404);

    const prescription = await PrescriptionModel.findOne({
      where: { id: String(req.params.prescriptionId), patientId: patient.id },
      include: [{ model: PrescriptionItemModel, as: "items" }],
    });

    if (!prescription) throw new HttpError("Prescrição não encontrada.", 404);

    const patientUser = await UserModel.findByPk(patient.userId);
    const prescriptionItems = prescription.get("items") as PrescriptionItemModel[] | undefined;
    const pdfBuffer = createSimplePdfBuffer({
      patientName: patientUser?.name?.trim() || "Paciente",
      createdAt: prescription.createdAt.toISOString(),
      conduct: prescription.conduct?.trim() || "Sem conduta registrada.",
      items: (prescriptionItems ?? []).map((item) => ({
        medication: item.medication,
        dose: item.dose,
        frequency: item.frequency,
        duration: item.duration,
        route: item.route,
      })),
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="prescrição-${prescription.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

patientRoutes.get("/me/anamnesis", requireRole("patient"), async (req, res, next) => {
  try {
    const patient = await PatientModel.findOne({
      where: { userId: req.auth!.userId },
    });
    if (!patient) throw new HttpError("Paciente não encontrado para este usuário.", 404);

    const anamnesis = await PatientAnamnesisModel.findByPk(patient.id);

    if (!anamnesis) {
      return res.json({
        patientId: patient.id,
        answers: {},
        formVersion: "anamnesis-v2",
        isCompleted: true,
        completedAt: null,
        updatedByUserId: req.auth!.userId,
        createdAt: null,
        updatedAt: null,
      });
    }

    res.json(anamnesis);
  } catch (error) {
    next(error);
  }
});

patientRoutes.put("/me/anamnesis", requireRole("patient"), async (req, res, next) => {
  try {
    const payload = upsertAnamnesisSchema.parse(req.body);
    const patient = await PatientModel.findOne({
      where: { userId: req.auth!.userId },
    });
    if (!patient) throw new HttpError("Paciente não encontrado para este usuário.", 404);

    const now = new Date();
    const anamnesis = await PatientAnamnesisModel.findByPk(patient.id);
    const bodyMassIndex = calculateBodyMassIndex(payload.answers.height, payload.answers.weight);
    const normalizedAnswers = {
      ...payload.answers,
      ...(patient.biologicalSex ? { biological_sex: patient.biologicalSex } : {}),
      ...(bodyMassIndex ? { body_mass_index: bodyMassIndex } : {}),
    };

    if (!anamnesis) {
      const created = await PatientAnamnesisModel.create({
        patientId: patient.id,
        answers: normalizedAnswers,
        formVersion: "anamnesis-v2",
        isCompleted: true,
        completedAt: now,
        updatedByUserId: req.auth!.userId,
        createdAt: now,
        updatedAt: now,
      });

      addAuditLog({
        actorUserId: req.auth!.userId,
        action: "anamnesis.create",
        resource: "patient_anamneses",
        resourceId: patient.id,
        ip: req.ip,
      });

      return res.status(201).json(created);
    }

    anamnesis.answers = normalizedAnswers;
    anamnesis.formVersion = "anamnesis-v2";
    anamnesis.isCompleted = true;
    anamnesis.completedAt = now;
    anamnesis.updatedByUserId = req.auth!.userId;
    anamnesis.updatedAt = now;
    await anamnesis.save();

    addAuditLog({
      actorUserId: req.auth!.userId,
      action: "anamnesis.update",
      resource: "patient_anamneses",
      resourceId: patient.id,
      ip: req.ip,
      metadata: { answerCount: Object.keys(payload.answers).length },
    });

    res.json(anamnesis);
  } catch (error) {
    next(error);
  }
});

patientRoutes.get("/me/profile", requireRole("patient"), async (req, res, next) => {
  try {
    const patient = await PatientModel.findOne({
      where: { userId: req.auth!.userId },
    });
    if (!patient) throw new HttpError("Paciente não encontrado para este usuário.", 404);

    const onboardingCompleted = isPatientOnboardingComplete(patient);
    if (patient.onboardingCompleted !== onboardingCompleted) {
      patient.onboardingCompleted = onboardingCompleted;
      patient.onboardingCompletedAt = onboardingCompleted ? patient.onboardingCompletedAt ?? new Date() : null;
      await patient.save();
    }

    addAuditLog({
      actorUserId: req.auth!.userId,
      action: "patient.profile.read",
      resource: "patients",
      resourceId: patient.id,
      ip: req.ip,
    });

    res.json(patient);
  } catch (error) {
    next(error);
  }
});

patientRoutes.put("/me/profile", requireRole("patient"), async (req, res, next) => {
  try {
    const payload = upsertPatientProfileSchema.parse(req.body);
    const patient = await PatientModel.findOne({
      where: { userId: req.auth!.userId },
    });
    if (!patient) throw new HttpError("Paciente não encontrado para este usuário.", 404);

    patient.birthDate = new Date(payload.birthDate);
    patient.cpf = payload.cpf;
    patient.biologicalSex = payload.biologicalSex;
    patient.phone = payload.phone;
    patient.addressZipCode = payload.addressZipCode;
    patient.addressStreet = payload.addressStreet.trim();
    patient.addressNumber = payload.addressNumber.trim();
    patient.addressComplement = payload.addressComplement?.trim() ?? null;
    patient.addressNeighborhood = payload.addressNeighborhood.trim();
    patient.addressCity = payload.addressCity.trim();
    patient.addressState = payload.addressState.trim().toUpperCase();
    patient.emergencyContactName = payload.emergencyContactName.trim();
    patient.emergencyContactPhone = payload.emergencyContactPhone;
    patient.onboardingCompleted = isPatientOnboardingComplete(patient);
    patient.onboardingCompletedAt = patient.onboardingCompleted ? new Date() : null;
    await patient.save();

    addAuditLog({
      actorUserId: req.auth!.userId,
      action: "patient.profile.update",
      resource: "patients",
      resourceId: patient.id,
      ip: req.ip,
      metadata: { onboardingCompleted: patient.onboardingCompleted },
    });

    res.json(patient);
  } catch (error) {
    next(error);
  }
});

patientRoutes.get("/", requireRole("doctor", "admin", "clinic_admin"), async (req, res, next) => {
  try {
    if (req.auth?.role !== "admin" && !req.auth?.clinicId) {
      throw new HttpError("Usuário sem clínica vinculada.", 403);
    }
    const where = req.auth?.role === "admin" ? {} : { clinicId: req.auth?.clinicId };
    const patients = await PatientModel.findAll({ where });
    const patientIds = patients.map((patient) => patient.id);
    const userIds = patients.map((patient) => patient.userId);
    const [records, users] = await Promise.all([
      patientIds.length > 0 ? MedicalRecordModel.findAll({ where: { patientId: patientIds } }) : Promise.resolve([]),
      userIds.length > 0 ? UserModel.findAll({ where: { id: userIds } }) : Promise.resolve([]),
    ]);
    const userNameById = new Map(users.map((user) => [user.id, user.name]));
    const recordByPatientId = new Map(records.map((record) => [record.patientId, record]));

    const items = patients.map((patient) => ({
      ...patient.toJSON(),
      name: userNameById.get(patient.userId) ?? "",
      record: recordByPatientId.get(patient.id)?.toJSON() ?? null,
    }));
    res.json(items);
  } catch (error) {
    next(error);
  }
});

patientRoutes.post("/", requireRole("doctor", "admin", "clinic_admin"), async (req, res, next) => {
  try {
    const payload = createPatientSchema.parse(req.body);

    const patientUser = await UserModel.findByPk(payload.userId);
    if (!patientUser || patientUser.role !== "patient") {
      throw new HttpError("Usuário informado não é um paciente.", 422);
    }

    const profileClinicId = patientUser.clinicId ?? null;
    if (req.auth?.role !== "admin") {
      if (!req.auth?.clinicId) throw new HttpError("Usuário sem clínica vinculada.", 403);
      if (profileClinicId !== req.auth.clinicId) {
        throw new HttpError("Paciente deve pertencer à mesma clínica.", 403);
      }
    }

    let patient = await PatientModel.findOne({ where: { userId: payload.userId } });
    if (!patient) {
      patient = await PatientModel.create({
        id: createId("patient"),
        userId: payload.userId,
        clinicId: profileClinicId,
        birthDate: payload.birthDate ? new Date(payload.birthDate) : null,
        createdAt: new Date(),
      });
    } else {
      if (payload.birthDate !== undefined) patient.birthDate = new Date(payload.birthDate);
      patient.clinicId = profileClinicId;
      await patient.save();
    }

    const record = await MedicalRecordModel.findByPk(patient.id);
    if (!record) {
      await MedicalRecordModel.create({
        patientId: patient.id,
        allergies: payload.record?.allergies ?? [],
        conditions: payload.record?.conditions ?? [],
        currentMedications: payload.record?.currentMedications ?? [],
        lastUpdatedAt: new Date(),
      });
    }

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

patientRoutes.get("/:patientId/record", requireRole("doctor", "admin", "clinic_admin", "patient"), async (req, res, next) => {
  try {
    const patientId = String(req.params.patientId);
    const patient = await PatientModel.findByPk(patientId);
    if (!patient) throw new HttpError("Paciente não encontrado.", 404);

    if (req.auth?.role === "patient" && req.auth.userId !== patient.userId) {
      throw new HttpError("Paciente não pode acessar prontuário de outro usuário.", 403);
    }
    if (req.auth?.role !== "patient") {
      ensureClinicAccess(req, patient.clinicId);
    }

    const record = await MedicalRecordModel.findByPk(patientId);
    const user = await UserModel.findByPk(patient.userId);

    res.json({
      patient: {
        ...patient.toJSON(),
        name: user?.name ?? "",
      },
      record: record?.toJSON() ?? {
        patientId: patient.id,
        allergies: [],
        conditions: [],
        currentMedications: [],
        lastUpdatedAt: null,
      },
    });
  } catch (error) {
    next(error);
  }
});

patientRoutes.patch("/:patientId/record", requireRole("doctor", "clinic_admin", "patient"), async (req, res, next) => {
  try {
    const patientId = String(req.params.patientId);
    const payload = updateRecordSchema.parse(req.body);
    const patient = await PatientModel.findByPk(patientId);
    if (!patient) throw new HttpError("Paciente não encontrado.", 404);

    if (req.auth?.role === "patient" && req.auth.userId !== patient.userId) {
      throw new HttpError("Paciente não pode alterar prontuário de outro usuário.", 403);
    }
    if (req.auth?.role !== "patient") {
      ensureClinicAccess(req, patient.clinicId);
    }

    const record = await MedicalRecordModel.findByPk(patientId);
    if (!record) throw new HttpError("Prontuário não encontrado.", 404);

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

patientRoutes.get("/:patientId/record/history", requireRole("doctor", "admin", "clinic_admin"), async (req, res, next) => {
  try {
    const patientId = String(req.params.patientId);
    const patient = await PatientModel.findByPk(patientId);
    if (!patient) throw new HttpError("Paciente não encontrado.", 404);
    ensureClinicAccess(req, patient.clinicId);

    const entries = await MedicalRecordHistoryModel.findAll({
      where: { patientId },
      order: [["createdAt", "DESC"]],
    });
    res.json(entries);
  } catch (error) {
    next(error);
  }
});

patientRoutes.get("/:patientId/anamnesis", requireRole("doctor", "admin", "clinic_admin"), async (req, res, next) => {
  try {
    const patientId = String(req.params.patientId);
    const patient = await PatientModel.findByPk(patientId);
    if (!patient) throw new HttpError("Paciente não encontrado.", 404);
    ensureClinicAccess(req, patient.clinicId);

    const anamnesis = await PatientAnamnesisModel.findByPk(patient.id);
    if (!anamnesis) throw new HttpError("Anamnese do paciente ainda não foi preenchida.", 404);
    const user = await UserModel.findByPk(patient.userId);

    addAuditLog({
      actorUserId: req.auth!.userId,
      action: "anamnesis.read",
      resource: "patient_anamneses",
      resourceId: patient.id,
      ip: req.ip,
    });

    res.json({
      patient: {
        ...patient.toJSON(),
        name: user?.name ?? "",
      },
      anamnesis,
    });
  } catch (error) {
    next(error);
  }
});

patientRoutes.delete("/:patientId", requireRole("admin"), async (req, res, next) => {
  try {
    const patientId = String(req.params.patientId);
    const patient = await PatientModel.findByPk(patientId);
    if (!patient) throw new HttpError("Paciente não encontrado.", 404);
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
