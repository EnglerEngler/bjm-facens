import type { NextFunction, Request, Response } from "express";
import { UserModel } from "../db/models/index.js";
import type { UserRole } from "../domain/types.js";
import { verifyAuthToken } from "../services/auth-service.js";
import { HttpError } from "../utils/http-error.js";

const extractToken = (authorization?: string) => {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
};

export const authMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractToken(req.headers.authorization);
  if (!token) return next(new HttpError("Token ausente.", 401));

  try {
    const decoded = verifyAuthToken(token);
    let clinicId = decoded.clinicId;
    if (!clinicId) {
      const user = await UserModel.findByPk(decoded.sub);
      clinicId = user?.clinicId ?? undefined;
    }
    req.auth = { userId: decoded.sub, role: decoded.role, clinicId };
    return next();
  } catch {
    return next(new HttpError("Token inválido ou expirado.", 401));
  }
};

export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(new HttpError("Não autenticado.", 401));
    if (!roles.includes(req.auth.role)) return next(new HttpError("Acesso negado para este perfil.", 403));
    return next();
  };
