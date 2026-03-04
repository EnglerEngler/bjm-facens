import { Router } from "express";
import { ClinicModel, DoctorModel, PatientModel, UserModel } from "../db/models/index.js";
import { authMiddleware, requireRole } from "../middleware/auth-middleware.js";
import { HttpError } from "../utils/http-error.js";

type DashboardClinic = {
  clinicId: string;
  clinicName: string;
  joinCode: string;
  doctors: Array<{ id: string; userId: string; name: string; email: string }>;
  patients: Array<{ id: string; userId: string; name: string; email: string; birthDate: string | null }>;
};

export const adminRoutes = Router();

adminRoutes.use(authMiddleware, requireRole("admin", "clinic_admin"));

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
        birthDate: patient.birthDate ? patient.birthDate.toISOString().slice(0, 10) : null,
      });
    });

    const items = Array.from(clinicMap.values()).sort((a, b) => a.clinicName.localeCompare(b.clinicName));
    res.json(items);
  } catch (error) {
    next(error);
  }
});
