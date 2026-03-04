import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "../sequelize.js";

export class AuditLogModel extends Model<InferAttributes<AuditLogModel>, InferCreationAttributes<AuditLogModel>> {
  declare id: string;
  declare actorUserId: string;
  declare action: string;
  declare resource: string;
  declare resourceId: string | null;
  declare ip: string;
  declare metadata: Record<string, unknown> | null;
  declare createdAt: Date;
}

AuditLogModel.init(
  {
    id: { type: DataTypes.STRING(50), allowNull: false, primaryKey: true },
    actorUserId: { type: DataTypes.STRING(50), allowNull: false, field: "actor_user_id" },
    action: { type: DataTypes.STRING(120), allowNull: false },
    resource: { type: DataTypes.STRING(120), allowNull: false },
    resourceId: { type: DataTypes.STRING(50), allowNull: true, field: "resource_id" },
    ip: { type: DataTypes.STRING(64), allowNull: false },
    metadata: { type: DataTypes.JSON, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at" },
  },
  {
    sequelize,
    tableName: "audit_logs",
    timestamps: false,
  },
);
