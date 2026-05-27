"use client";

import { use } from "react";
import { useAuditLogs } from "@/features/audit/hooks/useAuditLogs";
import { AuditTimeline } from "@/features/audit/components/AuditTimeline";
import { Skeleton } from "@/components/ui/skeleton";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AuditPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: logs, isLoading } = useAuditLogs(id);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold">Audit Log</h2>
        <p className="text-muted-foreground text-sm">
          Full chronological trail of all system and human actions for this
          workflow.
        </p>
      </div>

      <AuditTimeline logs={logs ?? []} />
    </div>
  );
}
