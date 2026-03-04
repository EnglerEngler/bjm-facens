import type { AuditLog } from "@/types/domain";

export function AuditTable({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="card">
      <h3>Logs de Auditoria</h3>
      <table>
        <thead>
          <tr>
            <th>Quando</th>
            <th>Ação</th>
            <th>Ator</th>
            <th>Recurso</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{new Date(log.createdAt).toLocaleString()}</td>
              <td>{log.action}</td>
              <td>{log.actorUserId}</td>
              <td>
                {log.resource}
                {log.resourceId ? ` (${log.resourceId})` : ""}
              </td>
              <td>{log.ip}</td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                Nenhum log encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
