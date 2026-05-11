import { Router, type Request } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sequelize } from "../db/sequelize.js";
import { ClinicModel, DoctorModel, PatientModel, UserModel } from "../db/models/index.js";
import { authMiddleware, requireRole } from "../middleware/auth-middleware.js";
import { addAuditLog } from "../services/audit-service.js";
import { createId } from "../utils/id.js";
import { HttpError } from "../utils/http-error.js";

type DashboardClinic = {
  clinicId: string;
  clinicName: string;
  joinCode: string;
  doctors: Array<{ id: string; userId: string; name: string; email: string; role: "doctor" }>;
  patients: Array<{ id: string; userId: string; name: string; email: string; role: "patient"; cpf: string | null; birthDate: string | null }>;
};

const normalizeCpf = (value: unknown) => (typeof value === "string" ? value.replace(/\D/g, "") : value);

const createClinicUserSchema = z
  .object({
    name: z.string().trim().min(3),
    email: z.string().trim().email(),
    password: z.string().min(6),
    role: z.enum(["doctor", "patient"]),
    cpf: z.preprocess(normalizeCpf, z.string().regex(/^\d{11}$/).nullable()).optional(),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  })
  .superRefine((payload, ctx) => {
    if (payload.role === "patient" && !payload.birthDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["birthDate"],
        message: "Nascimento e obrigatorio para paciente.",
      });
    }

    if (payload.role === "patient" && !payload.cpf) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cpf"],
        message: "CPF e obrigatorio para paciente.",
      });
    }
  });

const updateClinicUserSchema = z
  .object({
    name: z.string().trim().min(3).optional(),
    email: z.string().trim().email().optional(),
    password: z.string().min(6).optional(),
    cpf: z.preprocess(normalizeCpf, z.string().regex(/^\d{11}$/)).nullable().optional(),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    biologicalSex: z.enum(["masculino", "feminino"]).nullable().optional(),
    phone: z.preprocess((value) => (typeof value === "string" ? value.replace(/\D/g, "") : value), z.string().regex(/^\d{10,11}$/)).nullable().optional(),
    addressZipCode: z
      .preprocess((value) => (typeof value === "string" ? value.replace(/\D/g, "") : value), z.string().regex(/^\d{8}$/))
      .nullable()
      .optional(),
    addressStreet: z.string().trim().min(3).max(160).nullable().optional(),
    addressNumber: z.string().trim().min(1).max(20).nullable().optional(),
    addressComplement: z.preprocess((value) => (typeof value === "string" && value.trim() === "" ? null : value), z.string().max(120).nullable()).optional(),
    addressNeighborhood: z.string().trim().min(2).max(120).nullable().optional(),
    addressCity: z.string().trim().min(2).max(120).nullable().optional(),
    addressState: z.string().trim().regex(/^[A-Za-z]{2}$/).nullable().optional(),
    emergencyContactName: z.string().trim().min(3).max(160).nullable().optional(),
    emergencyContactPhone: z
      .preprocess((value) => (typeof value === "string" ? value.replace(/\D/g, "") : value), z.string().regex(/^\d{10,11}$/))
      .nullable()
      .optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });

export const adminRoutes = Router();

adminRoutes.use(authMiddleware, requireRole("admin", "clinic_admin"));

const serializeBirthDate = (value: unknown) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return null;
};

const resolveScopedClinicId = (req: Request, requestedClinicId?: string) => {
  const auth = req.auth;
  if (!auth) throw new HttpError("Nao autenticado.", 401);
  if (auth.role === "admin") {
    if (requestedClinicId) return requestedClinicId;
    if (auth.clinicId) return auth.clinicId;
    throw new HttpError("ClinicId obrigatorio para este contexto.", 422);
  }
  if (!auth.clinicId) throw new HttpError("Usuario sem clinica vinculada.", 403);
  return auth.clinicId;
};

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

const serializeManagedUser = (user: UserModel, doctor: DoctorModel | null, patient: PatientModel | null) => {
  const patientOnboardingCompleted = patient ? isPatientOnboardingComplete(patient) : null;

  return {
    id: patient?.id ?? doctor!.id,
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    cpf: patient?.cpf ?? null,
    birthDate: serializeBirthDate(patient?.birthDate),
    biologicalSex: patient?.biologicalSex ?? null,
    phone: patient?.phone ?? null,
    addressZipCode: patient?.addressZipCode ?? null,
    addressStreet: patient?.addressStreet ?? null,
    addressNumber: patient?.addressNumber ?? null,
    addressComplement: patient?.addressComplement ?? null,
    addressNeighborhood: patient?.addressNeighborhood ?? null,
    addressCity: patient?.addressCity ?? null,
    addressState: patient?.addressState ?? null,
    emergencyContactName: patient?.emergencyContactName ?? null,
    emergencyContactPhone: patient?.emergencyContactPhone ?? null,
    onboardingCompleted: patientOnboardingCompleted,
    onboardingCompletedAt: patientOnboardingCompleted ? patient?.onboardingCompletedAt?.toISOString() ?? null : null,
  };
};

adminRoutes.get("/dashboard", async (req, res, next) => {
  try {
    const isGlobalAdmin = req.auth?.role === "admin";
    const clinicId = req.auth?.clinicId;

    if (!isGlobalAdmin && !clinicId) {
      throw new HttpError("Usuario sem clinica vinculada.", 403);
    }

    const clinics = await ClinicModel.findAll({
      where: isGlobalAdmin ? {} : { id: clinicId! },
      order: [["name", "ASC"]],
    });

    const doctors = await DoctorModel.findAll({
      where: isGlobalAdmin ? {} : { clinicId: clinicId! },
      include: [{ model: UserModel, as: "user", attributes: ["id", "name", "email", "clinicId"], required: false }],
      order: [["createdAt", "DESC"]],
    });

    const patients = await PatientModel.findAll({
      where: isGlobalAdmin ? {} : { clinicId: clinicId! },
      include: [{ model: UserModel, as: "user", attributes: ["id", "name", "email", "clinicId"], required: false }],
      order: [["createdAt", "DESC"]],
    });

    const clinicMap = new Map<string, DashboardClinic>();

    clinics.forEach((clinic) => {
      clinicMap.set(clinic.id, {
        clinicId: clinic.id,
        clinicName: clinic.name,
        joinCode: clinic.joinCode,
        doctors: [],
        patients: [],
      });
    });

    const ensureClinic = (id: string) => {
      const existing = clinicMap.get(id);
      if (existing) return existing;
      const fallback: DashboardClinic = {
        clinicId: id,
        clinicName: `Clinica ${id}`,
        joinCode: "-",
        doctors: [],
        patients: [],
      };
      clinicMap.set(id, fallback);
      return fallback;
    };

    doctors.forEach((doctor) => {
      const doctorUser = doctor.get("user") as UserModel | undefined;
      const scopedClinicId = doctor.clinicId ?? doctorUser?.clinicId ?? null;
      if (!scopedClinicId) return;
      const clinic = ensureClinic(scopedClinicId);
      clinic.doctors.push({
        id: doctor.id,
        userId: doctor.userId,
        name: doctorUser?.name ?? "Sem nome",
        email: doctorUser?.email ?? "Sem email",
        role: "doctor",
      });
    });

    patients.forEach((patient) => {
      const patientUser = patient.get("user") as UserModel | undefined;
      const scopedClinicId = patient.clinicId ?? patientUser?.clinicId ?? null;
      if (!scopedClinicId) return;
      const clinic = ensureClinic(scopedClinicId);
      clinic.patients.push({
        id: patient.id,
        userId: patient.userId,
        name: patientUser?.name ?? "Sem nome",
        email: patientUser?.email ?? "Sem email",
        role: "patient",
        cpf: patient.cpf,
        birthDate: serializeBirthDate(patient.birthDate),
      });
    });

    const items = Array.from(clinicMap.values()).sort((a, b) => a.clinicName.localeCompare(b.clinicName));
    res.json(items);
  } catch (error) {
    next(error);
  }
});

adminRoutes.post("/users", async (req, res, next) => {
  try {
    const payload = createClinicUserSchema.parse(req.body);
    const clinicId = resolveScopedClinicId(req, req.body?.clinicId);

    const clinic = await ClinicModel.findByPk(clinicId);
    if (!clinic) throw new HttpError("Clinica nao encontrada.", 404);

    const existing = await UserModel.findOne({
      where: { email: payload.email.toLowerCase() },
    });
    if (existing) throw new HttpError("E-mail ja cadastrado.", 409);

    const passwordHash = await bcrypt.hash(payload.password, 10);

    const created = await sequelize.transaction(async (transaction) => {
      const user = await UserModel.create(
        {
          id: createId("user"),
          name: payload.name,
          email: payload.email.toLowerCase(),
          passwordHash,
          role: payload.role,
          clinicId,
          createdAt: new Date(),
        },
        { transaction },
      );

      if (payload.role === "doctor") {
        const doctor = await DoctorModel.create(
          {
            id: createId("doctor"),
            userId: user.id,
            clinicId,
            createdAt: new Date(),
          },
          { transaction },
        );

        return { id: doctor.id, userId: user.id, name: user.name, email: user.email, role: "doctor" as const, cpf: null, birthDate: null };
      }

      const patient = await PatientModel.create(
        {
          id: createId("patient"),
          userId: user.id,
          clinicId,
          cpf: payload.cpf ?? null,
          birthDate: payload.birthDate ? new Date(payload.birthDate) : null,
          createdAt: new Date(),
        },
        { transaction },
      );

      return {
        id: patient.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        role: "patient" as const,
        cpf: patient.cpf,
        birthDate: serializeBirthDate(patient.birthDate),
      };
    });

    addAuditLog({
      actorUserId: req.auth!.userId,
      action: "admin.user.create",
      resource: "users",
      resourceId: created.userId,
      ip: req.ip,
      metadata: { clinicId, role: created.role, profileId: created.id },
    });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

adminRoutes.get("/users/:userId", async (req, res, next) => {
  try {
    const requestedClinicId = typeof req.query.clinicId === "string" ? req.query.clinicId : undefined;
    const clinicId = resolveScopedClinicId(req, requestedClinicId);

    const user = await UserModel.findOne({
      where: { id: req.params.userId, clinicId },
    });
    if (!user) throw new HttpError("Usuario nao encontrado nesta clinica.", 404);
    if (user.role !== "doctor" && user.role !== "patient") {
      throw new HttpError("Somente medico e paciente podem ser consultados nesta tela.", 403);
    }

    const patient = user.role === "patient" ? await PatientModel.findOne({ where: { userId: user.id, clinicId } }) : null;
    if (user.role === "patient" && !patient) throw new HttpError("Perfil de paciente nao encontrado.", 404);

    const doctor = user.role === "doctor" ? await DoctorModel.findOne({ where: { userId: user.id, clinicId } }) : null;
    if (user.role === "doctor" && !doctor) throw new HttpError("Perfil de medico nao encontrado.", 404);

    res.json(serializeManagedUser(user, doctor, patient));
  } catch (error) {
    next(error);
  }
});

adminRoutes.patch("/users/:userId", async (req, res, next) => {
  try {
    const payload = updateClinicUserSchema.parse(req.body);
    const clinicId = resolveScopedClinicId(req, req.body?.clinicId);

    const user = await UserModel.findOne({
      where: { id: req.params.userId, clinicId },
    });
    if (!user) throw new HttpError("Usuario nao encontrado nesta clinica.", 404);
    if (user.role !== "doctor" && user.role !== "patient") {
      throw new HttpError("Somente medico e paciente podem ser editados nesta tela.", 403);
    }

    if (payload.email && payload.email.toLowerCase() !== user.email) {
      const existing = await UserModel.findOne({ where: { email: payload.email.toLowerCase() } });
      if (existing) throw new HttpError("E-mail ja cadastrado.", 409);
    }

    let patient: PatientModel | null = null;
    if (user.role === "patient") {
      patient = await PatientModel.findOne({ where: { userId: user.id, clinicId } });
      if (!patient) throw new HttpError("Perfil de paciente nao encontrado.", 404);
    }
    const doctor = user.role === "doctor" ? await DoctorModel.findOne({ where: { userId: user.id, clinicId } }) : null;
    if (user.role === "doctor" && !doctor) throw new HttpError("Perfil de medico nao encontrado.", 404);

    if (user.role === "doctor" && payload.birthDate !== undefined) {
      throw new HttpError("Nascimento so pode ser alterado para pacientes.", 422);
    }
    if (
      user.role === "doctor" &&
      (payload.cpf !== undefined ||
        payload.biologicalSex !== undefined ||
        payload.phone !== undefined ||
        payload.addressZipCode !== undefined ||
        payload.addressStreet !== undefined ||
        payload.addressNumber !== undefined ||
        payload.addressComplement !== undefined ||
        payload.addressNeighborhood !== undefined ||
        payload.addressCity !== undefined ||
        payload.addressState !== undefined ||
        payload.emergencyContactName !== undefined ||
        payload.emergencyContactPhone !== undefined)
    ) {
      throw new HttpError("Campos de perfil detalhado so podem ser alterados para pacientes.", 422);
    }

    await sequelize.transaction(async (transaction) => {
      if (payload.name) user.name = payload.name;
      if (payload.email) user.email = payload.email.toLowerCase();
      if (payload.password) user.passwordHash = await bcrypt.hash(payload.password, 10);
      await user.save({ transaction });

      if (patient) {
        if (payload.cpf !== undefined) patient.cpf = payload.cpf;
        if (payload.birthDate !== undefined) patient.birthDate = payload.birthDate ? new Date(payload.birthDate) : null;
        if (payload.biologicalSex !== undefined) patient.biologicalSex = payload.biologicalSex;
        if (payload.phone !== undefined) patient.phone = payload.phone;
        if (payload.addressZipCode !== undefined) patient.addressZipCode = payload.addressZipCode;
        if (payload.addressStreet !== undefined) patient.addressStreet = payload.addressStreet;
        if (payload.addressNumber !== undefined) patient.addressNumber = payload.addressNumber;
        if (payload.addressComplement !== undefined) patient.addressComplement = payload.addressComplement;
        if (payload.addressNeighborhood !== undefined) patient.addressNeighborhood = payload.addressNeighborhood;
        if (payload.addressCity !== undefined) patient.addressCity = payload.addressCity;
        if (payload.addressState !== undefined) patient.addressState = payload.addressState?.toUpperCase() ?? null;
        if (payload.emergencyContactName !== undefined) patient.emergencyContactName = payload.emergencyContactName;
        if (payload.emergencyContactPhone !== undefined) patient.emergencyContactPhone = payload.emergencyContactPhone;
        patient.onboardingCompleted = isPatientOnboardingComplete(patient);
        patient.onboardingCompletedAt = patient.onboardingCompleted ? new Date() : null;
        await patient.save({ transaction });
      }
    });

    addAuditLog({
      actorUserId: req.auth!.userId,
      action: "admin.user.update",
      resource: "users",
      resourceId: user.id,
      ip: req.ip,
      metadata: { clinicId, role: user.role },
    });

    res.json(serializeManagedUser(user, doctor, patient));
  } catch (error) {
    next(error);
  }
});
