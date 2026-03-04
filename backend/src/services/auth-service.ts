import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import { PasswordResetTokenModel, RefreshSessionModel, UserModel } from "../db/models/index.js";
import type { User, UserRole } from "../domain/types.js";
import { createId } from "../utils/id.js";
import { HttpError } from "../utils/http-error.js";

const sanitizeUser = (user: Pick<User, "id" | "name" | "email" | "role" | "createdAt">) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

export const registerUser = async (payload: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}) => {
  const existing = await UserModel.findOne({
    where: { email: payload.email.toLowerCase() },
  });
  if (existing) throw new HttpError("E-mail ja cadastrado.", 409);

  const passwordHash = await bcrypt.hash(payload.password, 10);
  const user = await UserModel.create({
    id: createId("user"),
    name: payload.name,
    email: payload.email.toLowerCase(),
    passwordHash,
    role: payload.role,
    createdAt: new Date(),
  });

  return sanitizeUser({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  });
};

export const loginUser = async (payload: { email: string; password: string }) => {
  const user = await UserModel.findOne({
    where: { email: payload.email.toLowerCase() },
  });
  if (!user) throw new HttpError("Credenciais invalidas.", 401);

  const isValid = await bcrypt.compare(payload.password, user.passwordHash);
  if (!isValid) throw new HttpError("Credenciais invalidas.", 401);

  const token = jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  });
  const refreshToken = jwt.sign({ sub: user.id, role: user.role, typ: "refresh" }, env.refreshSecret, {
    expiresIn: env.refreshExpiresIn as SignOptions["expiresIn"],
  });
  await RefreshSessionModel.create({
    id: createId("session"),
    userId: user.id,
    token: refreshToken,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return {
    token,
    refreshToken,
    user: sanitizeUser({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    }),
  };
};

export const verifyAuthToken = (token: string) =>
  jwt.verify(token, env.jwtSecret) as { sub: string; role: UserRole };

export const refreshAuthToken = async (refreshToken: string) => {
  const session = await RefreshSessionModel.findOne({
    where: { token: refreshToken, revokedAt: null },
  });
  if (!session) throw new HttpError("Refresh token invalido.", 401);

  const decoded = jwt.verify(refreshToken, env.refreshSecret) as { sub: string; role: UserRole };
  if (decoded.sub !== session.userId) throw new HttpError("Refresh token invalido.", 401);

  const accessToken = jwt.sign({ sub: decoded.sub, role: decoded.role }, env.jwtSecret, {
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

  // Em produção este token deve ser enviado por e-mail.
  return { accepted: true, resetTokenPreview: token };
};

export const resetPassword = async (payload: { token: string; newPassword: string }) => {
  const resetRecord = await PasswordResetTokenModel.findOne({
    where: { token: payload.token, usedAt: null },
  });
  if (!resetRecord) throw new HttpError("Token de recuperacao invalido.", 401);

  const decoded = jwt.verify(payload.token, env.refreshSecret) as { sub: string };
  if (decoded.sub !== resetRecord.userId) throw new HttpError("Token de recuperacao invalido.", 401);

  const user = await UserModel.findOne({
    where: { id: resetRecord.userId },
  });
  if (!user) throw new HttpError("Usuario nao encontrado.", 404);

  user.passwordHash = await bcrypt.hash(payload.newPassword, 10);
  resetRecord.usedAt = new Date();

  await user.save();
  await resetRecord.save();
  return { updated: true };
};
