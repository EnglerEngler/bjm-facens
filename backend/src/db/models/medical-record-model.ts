import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "../sequelize.js";

export class MedicalRecordModel extends Model<
  InferAttributes<MedicalRecordModel>,
  InferCreationAttributes<MedicalRecordModel>
> {
  declare patientId: string;
  declare allergies: string[];
  declare conditions: string[];
  declare currentMedications: string[];
  declare lastUpdatedAt: Date;
}

MedicalRecordModel.init(
  {
    patientId: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      field: "patient_id",
    },
    allergies: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    conditions: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    currentMedications: {
      type: DataTypes.JSON,
      allowNull: false,
      field: "current_medications",
    },
    lastUpdatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "last_updated_at",
    },
  },
  {
    sequelize,
    tableName: "medical_records",
    timestamps: false,
  },
);
