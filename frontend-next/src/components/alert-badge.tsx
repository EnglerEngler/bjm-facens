import type { AlertSeverity } from "@/types/domain";

const mapColor: Record<AlertSeverity, string> = {
  critical: "var(--critical)",
  high: "var(--high)",
  medium: "var(--medium)",
  low: "var(--low)",
};

export function AlertBadge({ severity }: { severity: AlertSeverity }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        color: "#fff",
        backgroundColor: mapColor[severity],
        fontWeight: 600,
        fontSize: 12,
        textTransform: "uppercase",
      }}
    >
      {severity}
    </span>
  );
}
