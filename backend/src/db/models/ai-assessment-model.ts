import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "../sequelize.js";

export class AIAssessmentModel extends Model<InferAttributes<AIAssessmentModel>, InferCreationAttributes<AIAssessmentModel>> {
  declare id: string;
  declare patientId: string;
  declare prescriptionId: string;
  declare inputSnapshot: Record<string, unknown>;
  declare outputSummary: Record<string, unknown>;
  declare promptVersion: string;
  declare modelVersion: string;
  declare createdAt: Date;
}

AIAssessmentModel.init(
  {
    id: { type: DataTypes.STRING(50), allowNull: false, primaryKey: true },
    patientId: { type: DataTypes.STRING(50), allowNull: false, field: "patient_id" },
    prescriptionId: { type: DataTypes.STRING(50), allowNull: false, field: "prescription_id" },
    inputSnapshot: { type: DataTypes.JSON, allowNull: false, field: "input_snapshot" },
    outputSummary: { type: DataTypes.JSON, allowNull: false, field: "output_summary" },
    promptVersion: { type: DataTypes.STRING(80), allowNull: false, field: "prompt_version" },
    modelVersion: { type: DataTypes.STRING(80), allowNull: false, field: "model_version" },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at" },
  },
  {
    sequelize,
    tableName: "ai_assessments",
    timestamps: false,
  },
);
