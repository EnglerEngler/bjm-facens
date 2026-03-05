import { AdminModel } from "./admin-model.js";
import { AIAssessmentModel } from "./ai-assessment-model.js";
import { AuditLogModel } from "./audit-log-model.js";
import { ClinicModel } from "./clinic-model.js";
import { ClinicAdminModel } from "./clinic-admin-model.js";
import { DoctorDecisionModel } from "./doctor-decision-model.js";
import { DoctorModel } from "./doctor-model.js";
import { MedicalRecordModel } from "./medical-record-model.js";
import { MedicalRecordHistoryModel } from "./medical-record-history-model.js";
import { PasswordResetTokenModel } from "./password-reset-token-model.js";
import { PatientAnamnesisModel } from "./patient-anamnesis-model.js";
import { PatientModel } from "./patient-model.js";
import { PrescriptionItemModel } from "./prescription-item-model.js";
import { PrescriptionModel } from "./prescription-model.js";
import { RefreshSessionModel } from "./refresh-session-model.js";
import { RiskAlertModel } from "./risk-alert-model.js";
import { UserModel } from "./user-model.js";

let initialized = false;

export const initModels = () => {
  if (initialized) return;

  UserModel.belongsTo(ClinicModel, { foreignKey: "clinicId", as: "clinic" });
  ClinicModel.hasMany(UserModel, { foreignKey: "clinicId", as: "users" });
  DoctorModel.belongsTo(UserModel, { foreignKey: "userId", as: "user" });
  DoctorModel.belongsTo(ClinicModel, { foreignKey: "clinicId", as: "clinic" });
  AdminModel.belongsTo(UserModel, { foreignKey: "userId", as: "user" });
  ClinicAdminModel.belongsTo(UserModel, { foreignKey: "userId", as: "user" });
  ClinicAdminModel.belongsTo(ClinicModel, { foreignKey: "clinicId", as: "clinic" });
  PatientModel.belongsTo(UserModel, { foreignKey: "userId", as: "user" });
  PatientModel.belongsTo(ClinicModel, { foreignKey: "clinicId", as: "clinic" });
  MedicalRecordModel.belongsTo(PatientModel, { foreignKey: "patientId", as: "patient" });
  PatientAnamnesisModel.belongsTo(PatientModel, { foreignKey: "patientId", as: "patient" });
  PrescriptionModel.belongsTo(PatientModel, { foreignKey: "patientId", as: "patient" });
  PrescriptionModel.belongsTo(DoctorModel, { foreignKey: "doctorId", targetKey: "userId", as: "doctor" });
  PrescriptionItemModel.belongsTo(PrescriptionModel, { foreignKey: "prescriptionId", as: "prescription" });
  PrescriptionModel.hasMany(PrescriptionItemModel, { foreignKey: "prescriptionId", as: "items" });
  RiskAlertModel.belongsTo(PrescriptionModel, { foreignKey: "prescriptionId", as: "prescription" });
  DoctorDecisionModel.belongsTo(RiskAlertModel, { foreignKey: "alertId", as: "alert" });
  AIAssessmentModel.belongsTo(PrescriptionModel, { foreignKey: "prescriptionId", as: "prescription" });
  RefreshSessionModel.belongsTo(UserModel, { foreignKey: "userId", as: "user" });
  PasswordResetTokenModel.belongsTo(UserModel, { foreignKey: "userId", as: "user" });
  AuditLogModel.belongsTo(UserModel, { foreignKey: "actorUserId", as: "actor" });
  MedicalRecordHistoryModel.belongsTo(PatientModel, { foreignKey: "patientId", as: "patient" });

  initialized = true;
};

export {
  AdminModel,
  AIAssessmentModel,
  AuditLogModel,
  ClinicModel,
  ClinicAdminModel,
  DoctorDecisionModel,
  DoctorModel,
  MedicalRecordHistoryModel,
  MedicalRecordModel,
  PasswordResetTokenModel,
  PatientAnamnesisModel,
  PatientModel,
  PrescriptionItemModel,
  PrescriptionModel,
  RefreshSessionModel,
  RiskAlertModel,
  UserModel,
};
