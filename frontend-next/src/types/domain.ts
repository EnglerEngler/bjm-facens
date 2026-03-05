export type UserRole = "doctor" | "patient" | "admin" | "clinic_admin";

export type AlertSeverity = "critical" | "high" | "medium" | "low";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  clinicId?: string;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  refreshToken: string;
  user: User;
}

export interface ApiErrorPayload {
  message: string;
  details?: unknown;
}

export interface Patient {
  id: string;
  userId: string;
  clinicId?: string;
  birthDate?: string;
  record?: MedicalRecord | null;
}

export interface MedicalRecord {
  patientId: string;
  allergies: string[];
  conditions: string[];
  currentMedications: string[];
  lastUpdatedAt: string;
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
  createdAt: string | null;
  updatedAt: string | null;
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
  status: "open" | "accepted" | "reviewed" | "ignored";
  createdAt: string;
}

export interface AIAssessment {
  id: string;
  patientId: string;
  prescriptionId: string;
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
  action: string;
  resource: string;
  resourceId?: string;
  ip: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AdminDashboardPerson {
  id: string;
  userId: string;
  name: string;
  email: string;
}

export interface AdminDashboardPatient extends AdminDashboardPerson {
  birthDate: string | null;
}

export interface AdminDashboardClinic {
  clinicId: string;
  clinicName: string;
  joinCode: string;
  doctors: AdminDashboardPerson[];
  patients: AdminDashboardPatient[];
}
