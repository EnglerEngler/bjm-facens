import cors from "cors";
import express from "express";
import { aiRoutes } from "./routes/ai-routes.js";
import { auditRoutes } from "./routes/audit-routes.js";
import { authRoutes } from "./routes/auth-routes.js";
import { dbRoutes } from "./routes/db-routes.js";
import { patientRoutes } from "./routes/patient-routes.js";
import { prescriptionRoutes } from "./routes/prescription-routes.js";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error-middleware.js";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "bjm-facens-backend" });
});

app.use("/auth", authRoutes);
app.use("/db", dbRoutes);
app.use("/patients", patientRoutes);
app.use("/prescriptions", prescriptionRoutes);
app.use("/ai", aiRoutes);
app.use("/audit-logs", auditRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
