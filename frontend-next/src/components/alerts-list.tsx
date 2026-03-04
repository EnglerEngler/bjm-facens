import { AlertBadge } from "@/components/alert-badge";
import type { RiskAlert } from "@/types/domain";

export function AlertsList({ alerts }: { alerts: RiskAlert[] }) {
  if (!alerts.length) {
    return <p className="muted">Nenhum alerta identificado.</p>;
  }

  return (
    <div className="grid">
      {alerts.map((alert) => (
        <article key={alert.id} className="card">
          <div className="between">
            <strong>{alert.ruleCode}</strong>
            <AlertBadge severity={alert.severity} />
          </div>
          <p>{alert.message}</p>
          <p className="muted">Status: {alert.status}</p>
        </article>
      ))}
    </div>
  );
}
