import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "../sequelize.js";

export class PatientAnamnesisModel extends Model<
  InferAttributes<PatientAnamnesisModel>,
  InferCreationAttributes<PatientAnamnesisModel>
> {
  declare patientId: string;
  declare answers: Record<string, string>;
  declare formVersion: string;
  declare isCompleted: boolean;
  declare completedAt: Date | null;
  declare updatedByUserId: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

PatientAnamnesisModel.init(
  {
    patientId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      primaryKey: true,
      field: "patient_id",
    },
    answers: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
    formVersion: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "kira-v1",
      field: "form_version",
    },
    isCompleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_completed",
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "completed_at",
    },
    updatedByUserId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "updated_by_user_id",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "updated_at",
    },
  },
  {
    sequelize,
    tableName: "patient_anamneses",
    timestamps: false,
  },
);
