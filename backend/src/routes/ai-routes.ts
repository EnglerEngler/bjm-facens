import { Router } from "express";
import { authMiddleware, requireRole } from "../middleware/auth-middleware.js";
import { getAnamnesisByPrescription } from "../services/analysis-service.js";
import { addAuditLog } from "../services/audit-service.js";

export const aiRoutes = Router();

aiRoutes.use(authMiddleware, requireRole("doctor", "admin"));

aiRoutes.get("/anamnesis/:prescriptionId", async (req, res, next) => {
  try {
    const assessment = await getAnamnesisByPrescription(req.params.prescriptionId);
    addAuditLog({
      actorUserId: req.auth!.userId,
      action: "ai.anamnesis.read",
      resource: "ai_assessments",
      resourceId: assessment?.id,
      ip: req.ip,
      metadata: { prescriptionId: req.params.prescriptionId },
    });
    res.json(assessment);
  } catch (error) {
    next(error);
  }
});
