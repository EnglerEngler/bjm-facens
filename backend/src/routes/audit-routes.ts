import { Router } from "express";
import { AuditLogModel, UserModel } from "../db/models/index.js";
import { authMiddleware, requireRole } from "../middleware/auth-middleware.js";

export const auditRoutes = Router();

auditRoutes.use(authMiddleware, requireRole("doctor", "admin", "clinic_admin"));

auditRoutes.get("/", async (req, res, next) => {
  const limit = Number(req.query.limit ?? 100);
  try {
    const entries = await AuditLogModel.findAll({
      include: [{ model: UserModel, as: "actor", attributes: ["id", "clinicId"], required: false }],
      order: [["createdAt", "DESC"]],
      limit,
    });

    if (req.auth?.role === "admin") {
      res.json(entries);
      return;
    }

    const filtered = entries.filter((entry) => {
      const actor = entry.get("actor") as UserModel | undefined;
      return actor?.clinicId && actor.clinicId === req.auth?.clinicId;
    });
    res.json(filtered);
  } catch (error) {
    next(error);
  }
});
