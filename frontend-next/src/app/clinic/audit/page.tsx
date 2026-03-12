"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
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
    <main className="doctor-dashboard audit-dashboard clinic-audit-dashboard">
      <section className="doctor-hero audit-dashboard-hero clinic-audit-hero">
        <div>
          <span className="doctor-kicker">Auditoria da clinica</span>
          <h1>Eventos vinculados a sua operacao</h1>
          <p className="muted">Consulte os registros recentes da sua clinica para validar acessos, cadastros e alteracoes relevantes.</p>
        </div>
        <div className="doctor-hero-meta">
          <span>{metrics.total} evento(s) carregados</span>
          <span>{metrics.actors} ator(es) distintos</span>
          <span>{metrics.resources} recurso(s) monitorados</span>
        </div>
      </section>

      <section className="doctor-search card">
        <div className="doctor-search-heading">
          <div>
            <h2>Escopo da clinica</h2>
            <p className="muted">Somente eventos pertencentes ao contexto da sua clinica dentro da janela atual de consulta.</p>
          </div>
        </div>

        <div className="doctor-facts-grid audit-summary-grid">
          <article className="doctor-fact-card">
            <span className="doctor-fact-label">Eventos</span>
            <strong>{metrics.total}</strong>
            <small>Registros recentes da sua unidade</small>
          </article>
          <article className="doctor-fact-card">
            <span className="doctor-fact-label">Atores</span>
            <strong>{metrics.actors}</strong>
            <small>Usuarios que interagiram no periodo</small>
          </article>
          <article className="doctor-fact-card">
            <span className="doctor-fact-label">Recursos</span>
            <strong>{metrics.resources}</strong>
            <small>Objetos afetados pelas operacoes</small>
          </article>
        </div>
      </section>

      {loading && <p>Carregando logs...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && <AuditTable logs={logs} emptyMessage="Nenhum evento da sua clinica foi encontrado na consulta atual." />}
    </main>
  );
}
