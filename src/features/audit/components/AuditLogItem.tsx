"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AuditStepBadge } from "./AuditStepBadge";
import { formatDistanceToNow } from "date-fns";

function toLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function DataValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">—</span>;
  }
  if (typeof value === "boolean") {
    return (
      <span className={value ? "text-green-600" : "text-red-600"}>
        {value ? "Yes" : "No"}
      </span>
    );
  }
  if (typeof value === "number") {
    return <span className="font-mono">{value.toLocaleString()}</span>;
  }
  if (typeof value === "string") {
    // UUID — truncate
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
      )
    ) {
      return (
        <span className="font-mono text-muted-foreground">
          {value.slice(0, 8)}…
        </span>
      );
    }
    return <span>{value}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0)
      return <span className="text-muted-foreground italic">empty</span>;
    return (
      <ul className="ml-2 list-disc space-y-0.5 pl-3">
        {value.map((item, i) => (
          <li key={i}>
            <DataValue value={item} />
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    return <DataGrid data={value as Record<string, unknown>} nested />;
  }
  return <span>{String(value)}</span>;
}

function DataGrid({
  data,
  nested,
}: {
  data: Record<string, unknown>;
  nested?: boolean;
}) {
  const entries = Object.entries(data);
  if (entries.length === 0)
    return <span className="text-muted-foreground italic">—</span>;
  return (
    <div className={nested ? "mt-1 space-y-1 border-l pl-3" : "space-y-1.5"}>
      {entries.map(([key, val]) => (
        <div key={key} className="flex flex-wrap gap-x-2 text-xs">
          <span className="text-muted-foreground shrink-0 font-medium">
            {toLabel(key)}:
          </span>
          <span className="break-all">
            <DataValue value={val} />
          </span>
        </div>
      ))}
    </div>
  );
}

interface AuditLog {
  id: string;
  workflow_id: string;
  actor_type: "HUMAN" | "SYSTEM";
  actor_id: string | null;
  step: string;
  status: string;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  duration_ms: number | null;
  created_at: string;
  actor: { full_name: string | null; email: string | null } | null;
}

interface AuditLogItemProps {
  log: AuditLog;
}

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: "text-green-600",
  FAILED: "text-red-600",
  STARTED: "text-blue-600",
  SKIPPED: "text-muted-foreground",
};

export function AuditLogItem({ log }: AuditLogItemProps) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = log.input || log.output || log.error;

  const actorName =
    log.actor_type === "HUMAN"
      ? (log.actor?.full_name ?? log.actor?.email ?? "Unknown User")
      : "System";

  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <div className="absolute left-0 top-1.5 flex size-5 items-center justify-center">
        <div
          className={`size-2 rounded-full ${
            log.actor_type === "HUMAN" ? "bg-blue-500" : "bg-slate-400"
          }`}
        />
      </div>

      <div className="pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <AuditStepBadge actorType={log.actor_type} step={log.step} />
          <span
            className={`text-xs font-medium ${STATUS_COLORS[log.status] ?? ""}`}
          >
            {log.status}
          </span>
          {log.duration_ms != null && (
            <span className="text-muted-foreground text-xs">
              {log.duration_ms}ms
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">{actorName}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
          </span>
        </div>

        {log.error && (
          <p className="mt-1.5 rounded bg-red-50 p-2 text-xs text-red-700">
            {log.error}
          </p>
        )}

        {hasDetails && !log.error && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-muted-foreground mt-1.5 flex items-center gap-1 text-xs hover:text-foreground"
          >
            {expanded ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
            {expanded ? "Hide details" : "Show details"}
          </button>
        )}

        {expanded && (log.input || log.output) && (
          <div className="mt-2 space-y-3">
            {log.input && (
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                  Input
                </p>
                <div className="rounded-md border bg-muted/40 px-3 py-2">
                  <DataGrid data={log.input} />
                </div>
              </div>
            )}
            {log.output && (
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                  Output
                </p>
                <div className="rounded-md border bg-muted/40 px-3 py-2">
                  <DataGrid data={log.output} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
