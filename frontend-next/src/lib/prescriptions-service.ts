import { ApiError, apiRequest } from "@/lib/api-client";
import type { Prescription, PrescriptionItem } from "@/types/domain";

export interface PatientPrescriptionView {
  id: string;
  patientId: string;
  status: Prescription["status"];
  createdAt: string;
  items: PrescriptionItem[];
  orientation: string;
}

export interface PatientPrescriptionResult {
  items: PatientPrescriptionView[];
  source: "api";
}

const toOrientation = (prescription: Prescription): string => {
  const firstMedication = prescription.items[0]?.medication ?? "medicação prescrita";
  return `Siga a posologia conforme prescrição. Em caso de reação adversa com ${firstMedication}, contate seu médico.`;
};

const mapPrescription = (item: Prescription): PatientPrescriptionView => ({
  id: item.id,
  patientId: item.patientId,
  status: item.status,
  createdAt: item.createdAt,
  items: item.items,
  orientation: toOrientation(item),
});

export const loadPatientPrescriptions = async (): Promise<PatientPrescriptionResult> => {
  try {
    const byMe = await apiRequest<Prescription[]>("/patients/me/prescriptions");
    return { items: byMe.map(mapPrescription), source: "api" };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    if (![403, 404].includes(error.status)) throw error;
  }

  try {
    const generic = await apiRequest<Prescription[]>("/prescriptions");
    return { items: generic.map(mapPrescription), source: "api" };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    if ([403, 404].includes(error.status)) {
      throw new ApiError(
        "Acesso negado para este perfil. O backend precisa liberar prescricoes do paciente.",
        error.status,
        error.details,
      );
    }
    throw error;
  }
};
