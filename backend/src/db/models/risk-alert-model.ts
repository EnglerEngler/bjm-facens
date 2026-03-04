import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "../sequelize.js";

export class RiskAlertModel extends Model<InferAttributes<RiskAlertModel>, InferCreationAttributes<RiskAlertModel>> {
  declare id: string;
  declare prescriptionId: string;
  declare patientId: string;
  declare severity: "critical" | "high" | "medium" | "low";
  declare ruleCode: string;
  declare message: string;
  declare evidence: string[];
  declare status: "open" | "accepted" | "reviewed" | "ignored";
  declare createdAt: Date;
}

RiskAlertModel.init(
  {
    id: { type: DataTypes.STRING(50), allowNull: false, primaryKey: true },
    prescriptionId: { type: DataTypes.STRING(50), allowNull: false, field: "prescription_id" },
    patientId: { type: DataTypes.STRING(50), allowNull: false, field: "patient_id" },
    severity: { type: DataTypes.ENUM("critical", "high", "medium", "low"), allowNull: false },
    ruleCode: { type: DataTypes.STRING(50), allowNull: false, field: "rule_code" },
    message: { type: DataTypes.TEXT, allowNull: false },
    evidence: { type: DataTypes.JSON, allowNull: false },
    status: { type: DataTypes.ENUM("open", "accepted", "reviewed", "ignored"), allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at" },
  },
  {
    sequelize,
    tableName: "risk_alerts",
    timestamps: false,
  },
);
