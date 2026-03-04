import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../sequelize.js";

export class UserModel extends Model<InferAttributes<UserModel>, InferCreationAttributes<UserModel>> {
  declare id: string;
  declare name: string;
  declare email: string;
  declare passwordHash: string;
  declare role: "doctor" | "patient" | "admin" | "clinic_admin";
  declare clinicId: string | null;
  declare createdAt: CreationOptional<Date>;
}

UserModel.init(
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(160),
      allowNull: false,
      unique: true,
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "password_hash",
    },
    role: {
      type: DataTypes.ENUM("doctor", "patient", "admin", "clinic_admin"),
      allowNull: false,
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
    tableName: "users",
    timestamps: false,
  },
);
