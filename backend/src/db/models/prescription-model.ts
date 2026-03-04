import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "../sequelize.js";

export class PrescriptionModel extends Model<InferAttributes<PrescriptionModel>, InferCreationAttributes<PrescriptionModel>> {
  declare id: string;
  declare doctorId: string;
  declare patientId: string;
  declare conduct: string | null;
  declare status: "draft" | "active" | "cancelled";
  declare createdAt: Date;
  declare updatedAt: Date | null;
  declare cancelledAt: Date | null;
  declare analyzedAt: Date | null;
}

PrescriptionModel.init(
  {
    id: { type: DataTypes.STRING(50), allowNull: false, primaryKey: true },
    doctorId: { type: DataTypes.STRING(50), allowNull: false, field: "doctor_id" },
    patientId: { type: DataTypes.STRING(50), allowNull: false, field: "patient_id" },
    conduct: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM("draft", "active", "cancelled"), allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, allowNull: true, field: "updated_at" },
    cancelledAt: { type: DataTypes.DATE, allowNull: true, field: "cancelled_at" },
    analyzedAt: { type: DataTypes.DATE, allowNull: true, field: "analyzed_at" },
  },
  {
    sequelize,
    tableName: "prescriptions",
    timestamps: false,
  },
);
