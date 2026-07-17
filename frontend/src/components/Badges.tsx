import { Priority, Severity, TestCaseStatus } from "../lib/api";

const priorityColor: Record<Priority, string> = {
  Low: "bg-panel2 text-muted border-border",
  Medium: "bg-info/10 text-info border-info/30",
  High: "bg-warn/10 text-warn border-warn/30",
  Critical: "bg-fail/10 text-fail border-fail/30",
};

const severityColor: Record<Severity, string> = {
  Minor: "bg-panel2 text-muted border-border",
  Major: "bg-warn/10 text-warn border-warn/30",
  Critical: "bg-fail/10 text-fail border-fail/30",
  Blocker: "bg-fail/20 text-fail border-fail/50",
};

const statusColor: Record<TestCaseStatus, string> = {
  Draft: "bg-panel2 text-muted border-border",
  Active: "bg-pass/10 text-pass border-pass/30",
  Deprecated: "bg-fail/10 text-fail border-fail/30",
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${className}`}>
      {label}
    </span>
  );
}

export const PriorityBadge = ({ value }: { value: Priority }) => (
  <Badge label={value} className={priorityColor[value]} />
);
export const SeverityBadge = ({ value }: { value: Severity }) => (
  <Badge label={value} className={severityColor[value]} />
);
export const StatusBadge = ({ value }: { value: TestCaseStatus }) => (
  <Badge label={value} className={statusColor[value]} />
);
