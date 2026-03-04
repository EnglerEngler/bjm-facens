import { AIAssessmentModel } from "./ai-assessment-model.js";
import { AuditLogModel } from "./audit-log-model.js";
import { DoctorDecisionModel } from "./doctor-decision-model.js";
import { MedicalRecordModel } from "./medical-record-model.js";
import { MedicalRecordHistoryModel } from "./medical-record-history-model.js";
import { PasswordResetTokenModel } from "./password-reset-token-model.js";
import { PatientModel } from "./patient-model.js";
import { PrescriptionItemModel } from "./prescription-item-model.js";
import { PrescriptionModel } from "./prescription-model.js";
import { RefreshSessionModel } from "./refresh-session-model.js";
import { RiskAlertModel } from "./risk-alert-model.js";
import { UserModel } from "./user-model.js";

let initialized = false;

export const initModels = () => {
  if (initialized) return;

  PatientModel.belongsTo(UserModel, { foreignKey: "userId", as: "user" });
  PatientModel.belongsTo(UserModel, { foreignKey: "doctorId", as: "doctor" });
  MedicalRecordModel.belongsTo(PatientModel, { foreignKey: "patientId", as: "patient" });
  PrescriptionModel.belongsTo(PatientModel, { foreignKey: "patientId", as: "patient" });
  PrescriptionModel.belongsTo(UserModel, { foreignKey: "doctorId", as: "doctor" });
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
  AIAssessmentModel,
  AuditLogModel,
  DoctorDecisionModel,
  MedicalRecordHistoryModel,
  MedicalRecordModel,
  PasswordResetTokenModel,
  PatientModel,
  PrescriptionItemModel,
  PrescriptionModel,
  RefreshSessionModel,
  RiskAlertModel,
  UserModel,
};
