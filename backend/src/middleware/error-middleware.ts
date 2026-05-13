import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/http-error.js";

export const notFoundMiddleware = (_req: Request, _res: Response, next: NextFunction) => {
  next(new HttpError("Rota não encontrada.", 404));
};

export const errorMiddleware = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ZodError) {
    return res.status(422).json({
      message: "Erro de validação.",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error("[errorMiddleware] unexpected error:", error);

  const errorMessage = error instanceof Error ? error.message : "Erro interno inesperado.";
  const isProduction = process.env.NODE_ENV === "production";

  return res.status(500).json({
    message: "Erro interno inesperado.",
    ...(isProduction ? {} : { details: errorMessage }),
  });
};
