"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { AuditTable } from "@/components/audit-table";
import { apiRequest } from "@/lib/api-client";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import type { AuditLog } from "@/types/domain";

export default function AdminAuditPage() {
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
        setError(err instanceof Error ? err.message : "Falha ao carregar auditoria.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const metrics = useMemo(() => {
    const actors = new Set(logs.map((log) => log.actorUserId));
    const resources = new Set(logs.map((log) => log.resource));
    return {
      total: logs.length,
      actors: actors.size,
      resources: resources.size,
    };
  }, [logs]);

  return (
    <main className="doctor-dashboard audit-dashboard">
      <section className="doctor-hero audit-dashboard-hero">
        <div>
          <span className="doctor-kicker">Auditoria administrativa</span>
          <h1>Monitoramento dos eventos do sistema</h1>
          <p className="muted">Acompanhe a trilha recente de operacoes criticas, acessos e alteracoes registradas na plataforma.</p>
        </div>
      </section>

      <section className="doctor-search card">
        <div className="doctor-search-heading">
          <div>
            <h2>Resumo da trilha</h2>
            <p className="muted">Visao agregada dos ultimos 100 eventos retornados pela API administrativa.</p>
          </div>
        </div>

        <div className="doctor-facts-grid audit-summary-grid">
          <article className="doctor-fact-card">
            <span className="doctor-fact-label">Eventos</span>
            <strong>{metrics.total}</strong>
            <small>Janela atual de auditoria</small>
          </article>
          <article className="doctor-fact-card">
            <span className="doctor-fact-label">Atores</span>
            <strong>{metrics.actors}</strong>
            <small>Usuarios que geraram logs</small>
          </article>
          <article className="doctor-fact-card">
            <span className="doctor-fact-label">Recursos</span>
            <strong>{metrics.resources}</strong>
            <small>Entidades impactadas pelas acoes</small>
          </article>
        </div>
      </section>

      {loading && <p>Carregando logs...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && <AuditTable logs={logs} emptyMessage="Nenhum evento administrativo foi retornado para o periodo consultado." />}
    </main>
  );
}
