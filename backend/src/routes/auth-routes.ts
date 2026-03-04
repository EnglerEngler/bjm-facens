import { Router } from "express";
import { z } from "zod";
import { addAuditLog } from "../services/audit-service.js";
import { loginUser, refreshAuthToken, registerUser, requestPasswordReset, resetPassword } from "../services/auth-service.js";

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().optional(),
);

const registerSchema = z
  .object({
    name: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(["doctor", "patient", "admin", "clinic_admin"]),
    clinicName: optionalText,
    clinicJoinCode: optionalText,
  })
  .superRefine((payload, ctx) => {
    if ((payload.role === "doctor" || payload.role === "patient") && !payload.clinicJoinCode?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["clinicJoinCode"],
        message: "Codigo da clinica e obrigatorio para medico e paciente.",
      });
    }

    if (payload.clinicJoinCode && payload.clinicJoinCode.trim().length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["clinicJoinCode"],
        message: "Codigo da clinica deve ter ao menos 6 caracteres.",
      });
    }

    if (payload.role === "clinic_admin" && !payload.clinicName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["clinicName"],
        message: "Nome da clinica e obrigatorio para admin da clinica.",
      });
    }

    if (payload.clinicName && payload.clinicName.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["clinicName"],
        message: "Nome da clinica deve ter ao menos 3 caracteres.",
      });
    }
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
