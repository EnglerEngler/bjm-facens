import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { initModels } from "./db/models/index.js";
import { adminRoutes } from "./routes/admin-routes.js";
import { aiRoutes } from "./routes/ai-routes.js";
import { auditRoutes } from "./routes/audit-routes.js";
import { authRoutes } from "./routes/auth-routes.js";
import { dbRoutes } from "./routes/db-routes.js";
import { patientRoutes } from "./routes/patient-routes.js";
import { prescriptionRoutes } from "./routes/prescription-routes.js";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error-middleware.js";

export const app = express();
initModels();

const allowedOrigins = new Set(
  env.corsOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

if (env.nodeEnv !== "production") {
  allowedOrigins.add("http://localhost:3002");
  allowedOrigins.add("http://127.0.0.1:3002");
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS origin not allowed."));
    },
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "bjm-facens-backend" });
});

app.use("/auth", authRoutes);
app.use("/db", dbRoutes);
app.use("/admin", adminRoutes);
app.use("/patients", patientRoutes);
app.use("/prescriptions", prescriptionRoutes);
app.use("/ai", aiRoutes);
app.use("/audit-logs", auditRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
