import { AuditLogModel } from "../db/models/index.js";
import { createId } from "../utils/id.js";

export const addAuditLog = (entry: {
  actorUserId: string;
  action: string;
  resource: string;
  resourceId?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
}) => {
  void AuditLogModel.create({
    id: createId("audit"),
    createdAt: new Date(),
    ip: entry.ip ?? "0.0.0.0",
    ...entry,
  }).catch((error) => {
    console.error("[audit] failed to persist log:", error);
  });
};
