"use client";

import { useMemo, useState } from "react";
import type { AuditLog } from "@/types/domain";

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
};

const formatAction = (value: string) =>
  value
    .split(".")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" / ");

const formatResource = (value: string) =>
  value
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

type AuditTableProps = {
  logs: AuditLog[];
  emptyMessage?: string;
};

export function AuditTable({ logs, emptyMessage = "Nenhum log encontrado." }: AuditTableProps) {
  const [query, setQuery] = useState("");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");

  const resourceOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.resource))).sort((a, b) => a.localeCompare(b)),
    [logs],
  );

  const filteredLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return logs.filter((log) => {
      if (resourceFilter !== "all" && log.resource !== resourceFilter) return false;
      if (scopeFilter === "with_patient" && !log.patientName && !log.patientId) return false;
      if (scopeFilter === "without_patient" && (log.patientName || log.patientId)) return false;
      if (!normalizedQuery) return true;

      const searchable = [
        log.action,
        formatAction(log.action),
        log.resource,
        formatResource(log.resource),
        log.resourceId ?? "",
        log.actorUserId,
        log.actorName ?? "",
        log.actorEmail ?? "",
        log.patientId ?? "",
        log.patientName ?? "",
        log.ip,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [logs, query, resourceFilter, scopeFilter]);

  return (
    <section className="card doctor-record-card audit-log-card">
      <div className="doctor-record-header">
        <div>
          <span className="doctor-section-label">Eventos</span>
          <h2>Trilha de auditoria</h2>
          <p className="muted">Busque por paciente, ator, ação, recurso, identificador ou IP para encontrar rapidamente o evento certo.</p>
        </div>
        <span className="doctor-result-chip">{filteredLogs.length} resultado(s)</span>
      </div>

      <div className="audit-toolbar">
        <label className="audit-filter-field audit-filter-field-search">
          <span className="sr-only">Pesquisar auditoria</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex.: Maria, prescription.create, patients, user_..."
            className="doctor-search-input"
          />
        </label>

        <label className="audit-filter-field">
          <span>Recurso</span>
          <select value={resourceFilter} onChange={(event) => setResourceFilter(event.target.value)}>
            <option value="all">Todos</option>
            {resourceOptions.map((resource) => (
              <option key={resource} value={resource}>
                {formatResource(resource)}
              </option>
            ))}
          </select>
        </label>

        <label className="audit-filter-field">
          <span>Paciente</span>
          <select value={scopeFilter} onChange={(event) => setScopeFilter(event.target.value)}>
            <option value="all">Todos</option>
            <option value="with_patient">Com paciente</option>
            <option value="without_patient">Sem paciente</option>
          </select>
        </label>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="patient-dashboard-empty-state audit-empty-state">
          <div>
            <strong>Nenhum evento encontrado</strong>
            <p className="muted">{emptyMessage}</p>
          </div>
        </div>
      ) : (
        <div className="audit-event-list">
          {filteredLogs.map((log) => (
            <article key={log.id} className="audit-event-card">
              <div className="audit-event-topline">
                <span className="audit-event-time">{formatDateTime(log.createdAt)}</span>
                <span className="audit-event-resource">{formatResource(log.resource)}</span>
              </div>

              <div className="audit-event-main">
                <div>
                  <strong>{formatAction(log.action)}</strong>
                  <p className="muted">
                    Ator: {log.actorName ?? "Usuário não identificado"}
                    {log.actorEmail ? ` · ${log.actorEmail}` : ` · ${log.actorUserId}`}
                  </p>
                </div>
                <div className="audit-event-patient">
                  <span>Paciente</span>
                  <strong>{log.patientName ?? "Não relacionado"}</strong>
                  <small>{log.patientId ?? "Sem paciente vinculado"}</small>
                </div>
              </div>

              <div className="doctor-patient-row-tags audit-event-tags">
                <span>Recurso ID {log.resourceId ?? "-"}</span>
                <span>IP {log.ip}</span>
                <span>Ator ID {log.actorUserId}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
