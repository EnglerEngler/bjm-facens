import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "../sequelize.js";

export class DoctorDecisionModel extends Model<
  InferAttributes<DoctorDecisionModel>,
  InferCreationAttributes<DoctorDecisionModel>
> {
  declare id: string;
  declare alertId: string;
  declare doctorId: string;
  declare action: "accepted" | "reviewed" | "ignored";
  declare justification: string | null;
  declare createdAt: Date;
}

DoctorDecisionModel.init(
  {
    id: { type: DataTypes.STRING(50), allowNull: false, primaryKey: true },
    alertId: { type: DataTypes.STRING(50), allowNull: false, field: "alert_id" },
    doctorId: { type: DataTypes.STRING(50), allowNull: false, field: "doctor_id" },
    action: { type: DataTypes.ENUM("accepted", "reviewed", "ignored"), allowNull: false },
    justification: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at" },
  },
  {
    sequelize,
    tableName: "doctor_decisions",
    timestamps: false,
  },
);
