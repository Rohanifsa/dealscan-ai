"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Cpu,
  ShieldCheck,
  Mail,
  CircleCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { AuditLogItem } from "./AuditLogItem";

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

interface Category {
  key: string;
  label: string;
  Icon: React.ElementType;
  match: (step: string) => boolean;
}

const CATEGORIES: Category[] = [
  {
    key: "setup",
    label: "Deal Setup",
    Icon: FolderOpen,
    match: (s) =>
      ["WORKFLOW_CREATED", "DOCUMENT_UPLOADED", "WORKFLOW_TRIGGERED"].includes(
        s,
      ),
  },
  {
    key: "extraction",
    label: "Extraction",
    Icon: Cpu,
    match: (s) => s.startsWith("EXTRACTION_"),
  },
  {
    key: "compliance",
    label: "Diligence Review",
    Icon: ShieldCheck,
    match: (s) => s.startsWith("COMPLIANCE_") || s.startsWith("VALIDATION_"),
  },
  {
    key: "review",
    label: "Review & Emails",
    Icon: Mail,
    match: (s) =>
      s.startsWith("HUMAN_REVIEW_") ||
      s.startsWith("SWIFT_") ||
      s.startsWith("TICKET_"),
  },
  {
    key: "outcome",
    label: "Outcome",
    Icon: CircleCheck,
    match: (s) => s === "WORKFLOW_RESOLVED" || s === "WORKFLOW_FAILED",
  },
];

interface AuditTimelineProps {
  logs: AuditLog[];
}

export function AuditTimeline({ logs }: AuditTimelineProps) {
  if (logs.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No activity yet</EmptyTitle>
          <EmptyDescription>
            Audit log entries will appear here as the workflow progresses.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  // Sort all logs ascending by created_at
  const sorted = [...logs].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  // Assign each log to a category (first match wins); uncategorised → "Other"
  const buckets: Record<string, AuditLog[]> = {};
  const otherLogs: AuditLog[] = [];

  for (const log of sorted) {
    const cat = CATEGORIES.find((c) => c.match(log.step));
    if (cat) {
      buckets[cat.key] = buckets[cat.key] ?? [];
      buckets[cat.key].push(log);
    } else {
      otherLogs.push(log);
    }
  }

  // Build ordered list of category groups that have at least one log
  const activeCategories = CATEGORIES.filter(
    (c) => (buckets[c.key]?.length ?? 0) > 0,
  );
  // Order by first event time
  activeCategories.sort((a, b) => {
    const aTime = new Date(buckets[a.key][0].created_at).getTime();
    const bTime = new Date(buckets[b.key][0].created_at).getTime();
    return aTime - bTime;
  });

  const allGroups: (Category & { logs: AuditLog[] })[] = [
    ...activeCategories.map((c) => ({ ...c, logs: buckets[c.key] })),
    ...(otherLogs.length > 0
      ? [
          {
            key: "other",
            label: "Other",
            Icon: FolderOpen,
            match: () => true,
            logs: otherLogs,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      {allGroups.map((group) => (
        <CategoryGroup key={group.key} group={group} />
      ))}
    </div>
  );
}

function CategoryGroup({
  group,
}: {
  group: {
    key: string;
    label: string;
    Icon: React.ElementType;
    logs: AuditLog[];
  };
}) {
  const [open, setOpen] = useState(true);
  const { Icon, label, logs } = group;
  const hasError = logs.some((l) => l.status === "FAILED");

  return (
    <div className="rounded-lg border">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
          <Badge
            variant={hasError ? "destructive" : "secondary"}
            className="text-xs tabular-nums"
          >
            {logs.length}
          </Badge>
        </div>
        {open ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
      </button>

      {/* Content */}
      {open && (
        <div className="relative border-t px-4 py-2">
          {/* Vertical line */}
          <div className="absolute left-[22px] top-0 bottom-0 w-px bg-border" />
          <div className="space-y-0">
            {logs.map((log) => (
              <AuditLogItem key={log.id} log={log} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
