"use client";

import { useState } from "react";
import { readSession } from "@/lib/auth-storage";
import { API_BASE_URL } from "@/lib/constants";

interface OpenPrescriptionPdfButtonProps {
  prescriptionId: string;
  className?: string;
}

export function OpenPrescriptionPdfButton({ prescriptionId, className }: OpenPrescriptionPdfButtonProps) {
  const [loading, setLoading] = useState(false);

  const openPdf = async () => {
    const session = readSession();
    if (!session?.token) {
      window.alert("Sessao expirada. Entre novamente para abrir a prescricao.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/patients/me/prescriptions/${prescriptionId}/pdf`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Falha ao abrir PDF da prescricao.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Falha ao abrir PDF da prescricao.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" className={className} onClick={() => void openPdf()} disabled={loading}>
      {loading ? "Abrindo PDF..." : "Abrir PDF"}
    </button>
  );
}
