import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../sequelize.js";

export class PrescriptionItemModel extends Model<
  InferAttributes<PrescriptionItemModel>,
  InferCreationAttributes<PrescriptionItemModel>
> {
  declare id: CreationOptional<number>;
  declare prescriptionId: string;
  declare medication: string;
  declare dose: string;
  declare frequency: string;
  declare duration: string;
  declare route: string;
}

PrescriptionItemModel.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
    prescriptionId: { type: DataTypes.STRING(50), allowNull: false, field: "prescription_id" },
    medication: { type: DataTypes.STRING(160), allowNull: false },
    dose: { type: DataTypes.STRING(80), allowNull: false },
    frequency: { type: DataTypes.STRING(80), allowNull: false },
    duration: { type: DataTypes.STRING(80), allowNull: false },
    route: { type: DataTypes.STRING(80), allowNull: false },
  },
  {
    sequelize,
    tableName: "prescription_items",
    timestamps: false,
  },
);
