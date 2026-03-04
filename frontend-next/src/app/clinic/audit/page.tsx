"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { AuditTable } from "@/components/audit-table";
import { apiRequest } from "@/lib/api-client";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import type { AuditLog } from "@/types/domain";

export default function ClinicAuditPage() {
  useAuthRedirect();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const entries = await apiRequest<AuditLog[]>("/audit-logs?limit=100");
        setLogs(entries);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar auditoria da clinica.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <main>
      <h1>Auditoria da Clínica</h1>
      <p className="muted">Somente eventos da sua clínica.</p>
      {loading && <p>Carregando logs...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && <AuditTable logs={logs} />}
    </main>
  );
}
