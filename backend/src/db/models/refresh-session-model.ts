import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "../sequelize.js";

export class RefreshSessionModel extends Model<
  InferAttributes<RefreshSessionModel>,
  InferCreationAttributes<RefreshSessionModel>
> {
  declare id: string;
  declare userId: string;
  declare token: string;
  declare expiresAt: Date;
  declare createdAt: Date;
  declare revokedAt: Date | null;
}

RefreshSessionModel.init(
  {
    id: { type: DataTypes.STRING(50), allowNull: false, primaryKey: true },
    userId: { type: DataTypes.STRING(50), allowNull: false, field: "user_id" },
    token: { type: DataTypes.TEXT, allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false, field: "expires_at" },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at" },
    revokedAt: { type: DataTypes.DATE, allowNull: true, field: "revoked_at" },
  },
  {
    sequelize,
    tableName: "refresh_sessions",
    timestamps: false,
  },
);
