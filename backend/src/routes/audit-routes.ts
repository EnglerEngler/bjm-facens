import { Router } from "express";
import { AuditLogModel } from "../db/models/index.js";
import { authMiddleware, requireRole } from "../middleware/auth-middleware.js";

export const auditRoutes = Router();

auditRoutes.use(authMiddleware, requireRole("doctor", "admin"));

auditRoutes.get("/", async (req, res, next) => {
  const limit = Number(req.query.limit ?? 100);
  try {
    const entries = await AuditLogModel.findAll({
      order: [["createdAt", "DESC"]],
      limit,
    });
    res.json(entries);
  } catch (error) {
    next(error);
  }
});
