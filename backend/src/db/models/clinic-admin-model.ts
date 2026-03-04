import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "../sequelize.js";

export class ClinicAdminModel extends Model<InferAttributes<ClinicAdminModel>, InferCreationAttributes<ClinicAdminModel>> {
  declare id: string;
  declare userId: string;
  declare clinicId: string | null;
  declare createdAt: CreationOptional<Date>;
}

ClinicAdminModel.init(
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: "user_id",
    },
    clinicId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "clinic_id",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
  },
  {
    sequelize,
    tableName: "clinic_admins",
    timestamps: false,
  },
);
