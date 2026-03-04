import { Router } from "express";
import { z } from "zod";
import { addAuditLog } from "../services/audit-service.js";
import { loginUser, refreshAuthToken, registerUser, requestPasswordReset, resetPassword } from "../services/auth-service.js";

const registerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["doctor", "patient", "admin"]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(6),
});

export const authRoutes = Router();

authRoutes.post("/register", async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);
    const user = await registerUser(payload);
    addAuditLog({
      actorUserId: user.id,
      action: "user.register",
      resource: "users",
      resourceId: user.id,
      ip: req.ip,
    });
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

authRoutes.post("/login", async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const result = await loginUser(payload);
    addAuditLog({
      actorUserId: result.user.id,
      action: "user.login",
      resource: "auth",
      ip: req.ip,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

authRoutes.post("/refresh", async (req, res, next) => {
  try {
    const payload = refreshSchema.parse(req.body);
    const token = await refreshAuthToken(payload.refreshToken);
    res.json(token);
  } catch (error) {
    next(error);
  }
});

authRoutes.post("/forgot-password", async (req, res, next) => {
  try {
    const payload = forgotPasswordSchema.parse(req.body);
    const result = await requestPasswordReset(payload.email);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

authRoutes.post("/reset-password", async (req, res, next) => {
  try {
    const payload = resetPasswordSchema.parse(req.body);
    const result = await resetPassword(payload);
    res.json(result);
  } catch (error) {
    next(error);
  }
});
