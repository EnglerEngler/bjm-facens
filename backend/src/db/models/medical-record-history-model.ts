import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "../sequelize.js";

export class MedicalRecordHistoryModel extends Model<
  InferAttributes<MedicalRecordHistoryModel>,
  InferCreationAttributes<MedicalRecordHistoryModel>
> {
  declare id: string;
  declare patientId: string;
  declare changedByUserId: string;
  declare beforeSnapshot: Record<string, unknown>;
  declare afterSnapshot: Record<string, unknown>;
  declare createdAt: Date;
}

MedicalRecordHistoryModel.init(
  {
    id: { type: DataTypes.STRING(50), allowNull: false, primaryKey: true },
    patientId: { type: DataTypes.STRING(50), allowNull: false, field: "patient_id" },
    changedByUserId: { type: DataTypes.STRING(50), allowNull: false, field: "changed_by_user_id" },
    beforeSnapshot: { type: DataTypes.JSON, allowNull: false, field: "before_snapshot" },
    afterSnapshot: { type: DataTypes.JSON, allowNull: false, field: "after_snapshot" },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at" },
  },
  {
    sequelize,
    tableName: "medical_record_history",
    timestamps: false,
  },
);
