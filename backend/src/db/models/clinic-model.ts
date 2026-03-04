import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "../sequelize.js";

export class ClinicModel extends Model<InferAttributes<ClinicModel>, InferCreationAttributes<ClinicModel>> {
  declare id: string;
  declare name: string;
  declare joinCode: string;
  declare createdAt: CreationOptional<Date>;
}

ClinicModel.init(
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(160),
      allowNull: false,
      unique: true,
    },
    joinCode: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
      field: "join_code",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
  },
  {
    sequelize,
    tableName: "clinics",
    timestamps: false,
  },
);
