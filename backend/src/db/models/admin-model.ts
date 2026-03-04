import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "../sequelize.js";

export class AdminModel extends Model<InferAttributes<AdminModel>, InferCreationAttributes<AdminModel>> {
  declare id: string;
  declare userId: string;
  declare createdAt: CreationOptional<Date>;
}

AdminModel.init(
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
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
  },
  {
    sequelize,
    tableName: "admins",
    timestamps: false,
  },
);
