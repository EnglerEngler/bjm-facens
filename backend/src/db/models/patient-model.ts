import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../sequelize.js";

export class PatientModel extends Model<InferAttributes<PatientModel>, InferCreationAttributes<PatientModel>> {
  declare id: string;
  declare userId: string;
  declare clinicId: string | null;
  declare birthDate: Date | null;
  declare biologicalSex: "masculino" | "feminino" | null;
  declare phone: string | null;
  declare addressZipCode: string | null;
  declare addressStreet: string | null;
  declare addressNumber: string | null;
  declare addressComplement: string | null;
  declare addressNeighborhood: string | null;
  declare addressCity: string | null;
  declare addressState: string | null;
  declare emergencyContactName: string | null;
  declare emergencyContactPhone: string | null;
  declare onboardingCompleted: CreationOptional<boolean>;
  declare onboardingCompletedAt: Date | null;
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
    clinicId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "clinic_id",
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "birth_date",
    },
    biologicalSex: {
      type: DataTypes.ENUM("masculino", "feminino"),
      allowNull: true,
      field: "biological_sex",
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    addressZipCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "address_zip_code",
    },
    addressStreet: {
      type: DataTypes.STRING(160),
      allowNull: true,
      field: "address_street",
    },
    addressNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "address_number",
    },
    addressComplement: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: "address_complement",
    },
    addressNeighborhood: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: "address_neighborhood",
    },
    addressCity: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: "address_city",
    },
    addressState: {
      type: DataTypes.STRING(2),
      allowNull: true,
      field: "address_state",
    },
    emergencyContactName: {
      type: DataTypes.STRING(160),
      allowNull: true,
      field: "emergency_contact_name",
    },
    emergencyContactPhone: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: "emergency_contact_phone",
    },
    onboardingCompleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "onboarding_completed",
    },
    onboardingCompletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "onboarding_completed_at",
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
