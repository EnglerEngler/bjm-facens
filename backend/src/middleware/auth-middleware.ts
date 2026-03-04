import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../domain/types.js";
import { verifyAuthToken } from "../services/auth-service.js";
import { HttpError } from "../utils/http-error.js";

const extractToken = (authorization?: string) => {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
};

export const authMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const token = extractToken(req.headers.authorization);
  if (!token) return next(new HttpError("Token ausente.", 401));

  try {
    const decoded = verifyAuthToken(token);
    req.auth = { userId: decoded.sub, role: decoded.role };
    return next();
  } catch {
    return next(new HttpError("Token invalido ou expirado.", 401));
  }
};

export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(new HttpError("Nao autenticado.", 401));
    if (!roles.includes(req.auth.role)) return next(new HttpError("Acesso negado para este perfil.", 403));
    return next();
  };
