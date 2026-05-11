export type UserRole = "doctor" | "patient" | "admin" | "clinic_admin";

export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type AlertStatus = "open" | "accepted" | "reviewed" | "ignored";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  clinicId?: string;
  onboardingCompleted: boolean;
  onboardingCompletedAt?: string | null;
  createdAt: string;
}

export interface Clinic {
  id: string;
  name: string;
  joinCode: string;
  createdAt: string;
}

export interface Patient {
  id: string;
  userId: string;
  clinicId?: string;
  cpf?: string | null;
  birthDate?: string;
}

export interface MedicalRecord {
  patientId: string;
  allergies: string[];
  conditions: string[];
  currentMedications: string[];
  lastUpdatedAt?: string | null;
}

export interface MedicalRecordHistoryEntry {
  id: string;
  patientId: string;
  changedByUserId: string;
  before: MedicalRecord;
  after: MedicalRecord;
  createdAt: string;
}

export interface PatientAnamnesis {
  patientId: string;
  answers: Record<string, string>;
  formVersion: string;
  isCompleted: boolean;
  completedAt: string | null;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrescriptionItem {
  medication: string;
  dose: string;
  frequency: string;
  duration: string;
  route: string;
}

export interface Prescription {
  id: string;
  doctorId: string;
  patientId: string;
  conduct?: string;
  items: PrescriptionItem[];
  status: "draft" | "active" | "cancelled";
  createdAt: string;
  updatedAt?: string;
  cancelledAt?: string;
  analyzedAt?: string;
}

export interface RiskAlert {
  id: string;
  prescriptionId: string;
  patientId: string;
  severity: AlertSeverity;
  ruleCode: string;
  message: string;
  evidence: string[];
  status: AlertStatus;
  createdAt: string;
}

export interface DoctorDecision {
  id: string;
  alertId: string;
  doctorId: string;
  action: Exclude<AlertStatus, "open">;
  justification?: string;
  createdAt: string;
}

export interface AIAssessment {
  id: string;
  patientId: string;
  prescriptionId: string;
  inputSnapshot: Record<string, unknown>;
  outputSummary: {
    summary: string;
    highlights: string[];
    limitations: string[];
  };
  promptVersion: string;
  modelVersion: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  actorName?: string | null;
  actorEmail?: string | null;
  action: string;
  resource: string;
  resourceId?: string;
  patientId?: string | null;
  patientName?: string | null;
  ip: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface RefreshSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  revokedAt?: string;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
}
