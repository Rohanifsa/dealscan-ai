"use client";

import { use, useMemo, useState } from "react";
import { useDiscrepancies } from "@/features/compliance/hooks/useDiscrepancies";
import { formatDocType } from "@/features/documents/utils/docTypeLabels";
import { DiscrepancySummaryBar } from "@/features/compliance/components/DiscrepancySummaryBar";
import {
  DiscrepancyFilterTabs,
  type DiscrepancyFilter,
} from "@/features/compliance/components/DiscrepancyFilterTabs";
import { DiscrepancyGroup } from "@/features/compliance/components/DiscrepancyGroup";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DiscrepanciesPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: discrepancies, isLoading, refetch } = useDiscrepancies(id);
  const [filter, setFilter] = useState<DiscrepancyFilter>("ALL");

  const counts = useMemo<Record<DiscrepancyFilter, number>>(() => {
    const all = discrepancies ?? [];
    return {
      ALL: all.length,
      PENDING: all.filter((d) => !(d as any).resolved_by).length,
      REVIEWED: all.filter((d) => !!(d as any).resolved_by).length,
    };
  }, [discrepancies]);

  const riskScore = useMemo(() => {
    if (!discrepancies?.length) return 0;
    const disc = discrepancies.filter((d) => d.status === "DISCREPANCY").length;
    return Math.round((disc / discrepancies.length) * 100);
  }, [discrepancies]);

  const filtered = useMemo(() => {
    if (!discrepancies) return [];
    if (filter === "PENDING")
      return discrepancies.filter((d) => !(d as any).resolved_by);
    if (filter === "REVIEWED")
      return discrepancies.filter((d) => !!(d as any).resolved_by);
    return discrepancies;
  }, [discrepancies, filter]);

  // Group by doc pair
  const groups = useMemo(() => {
    const groupMap = new Map<string, typeof filtered>();
    for (const d of filtered) {
      const sourceType = (d.source_doc as any)?.type ?? "N/A";
      const compareType = (d.compare_doc as any)?.type ?? "N/A";
      const key = `${formatDocType(sourceType)} ↔ ${formatDocType(compareType)}`;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(d);
    }
    return Array.from(groupMap.entries());
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!discrepancies?.length) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No red flags found</EmptyTitle>
          <EmptyDescription>
            Red flags will appear here after diligence validation runs.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-6">
      <DiscrepancySummaryBar
        total={counts.ALL}
        discrepancies={
          discrepancies?.filter((d) => d.status === "DISCREPANCY").length ?? 0
        }
        reviewed={counts.REVIEWED}
        riskScore={riskScore}
      />

      <DiscrepancyFilterTabs
        value={filter}
        onChange={setFilter}
        counts={counts}
      />

      <div className="space-y-3">
        {groups.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No matches</EmptyTitle>
              <EmptyDescription>
                No red flags match this filter.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          groups.map(([label, items]) => (
            <DiscrepancyGroup
              key={label}
              label={label}
              discrepancies={items}
              onReviewed={() => refetch()}
            />
          ))
        )}
      </div>
    </div>
  );
}
