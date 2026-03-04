import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "../sequelize.js";

export class PasswordResetTokenModel extends Model<
  InferAttributes<PasswordResetTokenModel>,
  InferCreationAttributes<PasswordResetTokenModel>
> {
  declare id: string;
  declare userId: string;
  declare token: string;
  declare expiresAt: Date;
  declare usedAt: Date | null;
  declare createdAt: Date;
}

PasswordResetTokenModel.init(
  {
    id: { type: DataTypes.STRING(50), allowNull: false, primaryKey: true },
    userId: { type: DataTypes.STRING(50), allowNull: false, field: "user_id" },
    token: { type: DataTypes.TEXT, allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false, field: "expires_at" },
    usedAt: { type: DataTypes.DATE, allowNull: true, field: "used_at" },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at" },
  },
  {
    sequelize,
    tableName: "password_reset_tokens",
    timestamps: false,
  },
);
