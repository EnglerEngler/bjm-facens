import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../sequelize.js";

export class PatientModel extends Model<InferAttributes<PatientModel>, InferCreationAttributes<PatientModel>> {
  declare id: string;
  declare userId: string;
  declare doctorId: string | null;
  declare birthDate: Date | null;
  declare createdAt: CreationOptional<Date>;
}

PatientModel.init(
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "user_id",
    },
    doctorId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "doctor_id",
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "birth_date",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
  },
  {
    sequelize,
    tableName: "patients",
    timestamps: false,
  },
);
