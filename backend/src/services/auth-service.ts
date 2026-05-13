import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { UniqueConstraintError } from "sequelize";
import { env } from "../config/env.js";
import {
  AdminModel,
  AuditLogModel,
  ClinicAdminModel,
  ClinicModel,
  DoctorModel,
  PasswordResetTokenModel,
  PatientModel,
  RefreshSessionModel,
  UserModel,
} from "../db/models/index.js";
import { sequelize } from "../db/sequelize.js";
import type { User, UserRole } from "../domain/types.js";
import { createId } from "../utils/id.js";
import { HttpError } from "../utils/http-error.js";

export const LGPD_ACCEPTED_ACTION = "user.lgpd.accept";

export const getLgpdAcceptance = async (userId: string) => {
  const acceptedLog = await AuditLogModel.findOne({
    where: {
      actorUserId: userId,
      action: LGPD_ACCEPTED_ACTION,
    },
    order: [["createdAt", "ASC"]],
  });

  return {
    lgpdAccepted: Boolean(acceptedLog),
    lgpdAcceptedAt: acceptedLog?.createdAt.toISOString() ?? null,
  };
};

const sanitizeUser = (
  user: Pick<User, "id" | "name" | "email" | "role" | "clinicId" | "createdAt" | "onboardingCompleted" | "onboardingCompletedAt"> & {
    lgpdAccepted: boolean;
    lgpdAcceptedAt: string | null;
  },
) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  clinicId: user.clinicId,
  lgpdAccepted: user.lgpdAccepted,
  lgpdAcceptedAt: user.lgpdAcceptedAt,
  onboardingCompleted: user.onboardingCompleted,
  onboardingCompletedAt: user.onboardingCompletedAt,
  createdAt: user.createdAt,
});

export const registerUser = async (payload: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  clinicName?: string;
  clinicJoinCode?: string;
}) => {
  let clinicId: string | null = null;
  let createdClinicJoinCode: string | undefined;
  let createdClinicName: string | undefined;

  if (payload.role === "doctor" || payload.role === "patient") {
    if (!payload.clinicJoinCode) {
      throw new HttpError("Cadastro de médico e paciente exige código da clínica.", 422);
    }

    const clinic = await ClinicModel.findOne({
      where: { joinCode: payload.clinicJoinCode.trim() },
    });
    if (!clinic) throw new HttpError("Código da clínica inválido.", 422);
    clinicId = clinic.id;
  }

  if (payload.role === "clinic_admin") {
    if (!payload.clinicName) throw new HttpError("Cadastro de admin da clínica exige nome da clínica.", 422);

    const normalizedName = payload.clinicName.trim();
    if (normalizedName.length < 3) {
      throw new HttpError("Nome da clínica deve ter ao menos 3 caracteres.", 422);
    }

    const existingClinic = await ClinicModel.findOne({ where: { name: normalizedName } });
    if (existingClinic) throw new HttpError("Já existe clínica com este nome.", 409);
    createdClinicName = normalizedName;
  }

  const existing = await UserModel.findOne({
    where: { email: payload.email.toLowerCase() },
  });
  if (existing) throw new HttpError("E-mail já cadastrado.", 409);

  const passwordHash = await bcrypt.hash(payload.password, 10);
  let user;
  try {
    user = await sequelize.transaction(async (transaction) => {
      if (payload.role === "clinic_admin" && createdClinicName) {
        const clinic = await ClinicModel.create(
          {
            id: createId("clinic"),
            name: createdClinicName,
            joinCode: `CL-${randomBytes(5).toString("hex").toUpperCase()}`,
            createdAt: new Date(),
          },
          { transaction },
        );
        clinicId = clinic.id;
        createdClinicJoinCode = clinic.joinCode;
      }

      const createdUser = await UserModel.create(
        {
          id: createId("user"),
          name: payload.name,
          email: payload.email.toLowerCase(),
          passwordHash,
          role: payload.role,
          clinicId,
          onboardingCompleted: false,
          onboardingCompletedAt: null,
          createdAt: new Date(),
        },
        { transaction },
      );

      if (payload.role === "doctor") {
        await DoctorModel.create(
          {
            id: createId("doctor"),
            userId: createdUser.id,
            clinicId,
            createdAt: new Date(),
          },
          { transaction },
        );
      } else if (payload.role === "patient") {
        await PatientModel.create(
          {
            id: createId("patient"),
            userId: createdUser.id,
            clinicId,
            birthDate: null,
            createdAt: new Date(),
          },
          { transaction },
        );
      } else if (payload.role === "admin") {
        await AdminModel.create(
          {
            id: createId("admin"),
            userId: createdUser.id,
            createdAt: new Date(),
          },
          { transaction },
        );
      } else if (payload.role === "clinic_admin") {
        await ClinicAdminModel.create(
          {
            id: createId("clinicadmin"),
            userId: createdUser.id,
            clinicId,
            createdAt: new Date(),
          },
          { transaction },
        );
      }

      return createdUser;
    });
  } catch (error) {
    if (
      error instanceof UniqueConstraintError &&
      payload.role === "clinic_admin" &&
      error.errors.some((item) => item.path === "name")
    ) {
      throw new HttpError("Já existe clínica com este nome.", 409);
    }
    throw error;
  }

  const lgpdAcceptance = await getLgpdAcceptance(user.id);
  const userOutput = sanitizeUser({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    clinicId: user.clinicId ?? undefined,
    lgpdAccepted: lgpdAcceptance.lgpdAccepted,
    lgpdAcceptedAt: lgpdAcceptance.lgpdAcceptedAt,
    onboardingCompleted: user.onboardingCompleted,
    onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  });
  return {
    ...userOutput,
    ...(createdClinicJoinCode ? { clinicJoinCode: createdClinicJoinCode } : {}),
  };
};

export const loginUser = async (payload: { email: string; password: string }) => {
  const user = await UserModel.findOne({
    where: { email: payload.email.toLowerCase() },
  });
  if (!user) throw new HttpError("E-mail não cadastrado.", 401);

  const isValid = await bcrypt.compare(payload.password, user.passwordHash);
  if (!isValid) throw new HttpError("Senha incorreta.", 401);

  const token = jwt.sign({ sub: user.id, role: user.role, clinicId: user.clinicId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  });
  const refreshToken = jwt.sign({ sub: user.id, role: user.role, clinicId: user.clinicId, typ: "refresh" }, env.refreshSecret, {
    expiresIn: env.refreshExpiresIn as SignOptions["expiresIn"],
  });
  await RefreshSessionModel.create({
    id: createId("session"),
    userId: user.id,
    token: refreshToken,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const lgpdAcceptance = await getLgpdAcceptance(user.id);
  return {
    token,
    refreshToken,
    user: sanitizeUser({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId ?? undefined,
      lgpdAccepted: lgpdAcceptance.lgpdAccepted,
      lgpdAcceptedAt: lgpdAcceptance.lgpdAcceptedAt,
      onboardingCompleted: user.onboardingCompleted,
      onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    }),
  };
};

export const verifyAuthToken = (token: string) =>
  jwt.verify(token, env.jwtSecret) as { sub: string; role: UserRole; clinicId?: string };

export const refreshAuthToken = async (refreshToken: string) => {
  const session = await RefreshSessionModel.findOne({
    where: { token: refreshToken, revokedAt: null },
  });
  if (!session) throw new HttpError("Refresh token inválido.", 401);

  const decoded = jwt.verify(refreshToken, env.refreshSecret) as { sub: string; role: UserRole; clinicId?: string };
  if (decoded.sub !== session.userId) throw new HttpError("Refresh token inválido.", 401);

  const accessToken = jwt.sign({ sub: decoded.sub, role: decoded.role, clinicId: decoded.clinicId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  });

  return { token: accessToken };
};

export const requestPasswordReset = async (email: string) => {
  const user = await UserModel.findOne({
    where: { email: email.toLowerCase() },
  });
  if (!user) return { accepted: true };

  const token = jwt.sign({ sub: user.id, typ: "password-reset" }, env.refreshSecret, {
    expiresIn: "30m" as SignOptions["expiresIn"],
  });
  await PasswordResetTokenModel.create({
    id: createId("pwd"),
    userId: user.id,
    token,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  });

  if (env.exposeResetTokenPreview) {
    return { accepted: true, resetTokenPreview: token };
  }

  return { accepted: true };
};

export const resetPassword = async (payload: { token: string; newPassword: string }) => {
  const resetRecord = await PasswordResetTokenModel.findOne({
    where: { token: payload.token, usedAt: null },
  });
  if (!resetRecord) throw new HttpError("Token de recuperação inválido.", 401);

  const decoded = jwt.verify(payload.token, env.refreshSecret) as { sub: string };
  if (decoded.sub !== resetRecord.userId) throw new HttpError("Token de recuperação inválido.", 401);

  const user = await UserModel.findOne({
    where: { id: resetRecord.userId },
  });
  if (!user) throw new HttpError("Usuário não encontrado.", 404);

  user.passwordHash = await bcrypt.hash(payload.newPassword, 10);
  resetRecord.usedAt = new Date();

  await user.save();
  await resetRecord.save();
  return { updated: true };
};
