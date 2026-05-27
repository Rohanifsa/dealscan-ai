"use client";

import { use, useMemo, useState } from "react";
import { useDiscrepancies } from "@/features/compliance/hooks/useDiscrepancies";
import { DiscrepancyGroup } from "@/features/compliance/components/DiscrepancyGroup";
import { Empty } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, ChevronDown, ChevronRight } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ReviewPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: discrepancies, isLoading, refetch } = useDiscrepancies(id);
  const [showReviewed, setShowReviewed] = useState(false);

  // Items awaiting human review: flagged as DISCREPANCY but not yet reviewed
  const pendingReview = useMemo(
    () =>
      discrepancies?.filter(
        (d) => d.status === "DISCREPANCY" && !(d as any).resolved_by,
      ) ?? [],
    [discrepancies],
  );

  // Items already reviewed (approved or confirmed rejection)
  const reviewed = useMemo(
    () =>
      discrepancies?.filter(
        (d) =>
          d.status === "APPROVED" ||
          (d.status === "DISCREPANCY" && !!(d as any).resolved_by),
      ) ?? [],
    [discrepancies],
  );

  // Group by doc pair
  const groups = useMemo(() => {
    const groupMap = new Map<string, typeof pendingReview>();
    for (const d of pendingReview) {
      const sourceType = d.source_doc?.doc_type ?? "N/A";
      const compareType = d.compare_doc?.doc_type ?? "N/A";
      const key = `${sourceType} ↔ ${compareType}`;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(d);
    }
    return Array.from(groupMap.entries());
  }, [pendingReview]);

  const reviewedGroups = useMemo(() => {
    const groupMap = new Map<string, typeof reviewed>();
    for (const d of reviewed) {
      const sourceType = d.source_doc?.doc_type ?? "N/A";
      const compareType = d.compare_doc?.doc_type ?? "N/A";
      const key = `${sourceType} ↔ ${compareType}`;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(d);
    }
    return Array.from(groupMap.entries());
  }, [reviewed]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Human Review Queue</h2>
          <p className="text-muted-foreground text-sm">
            Review each diligence red flag and decide whether to clear it or
            raise a management query.
          </p>
        </div>
        {pendingReview.length > 0 && (
          <Badge variant="secondary">{pendingReview.length} pending</Badge>
        )}
      </div>

      {pendingReview.length === 0 ? (
        <Alert>
          <CheckCircle className="size-4 text-green-600" />
          <AlertDescription>
            All red flags have been reviewed.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          {groups.map(([label, items]) => (
            <DiscrepancyGroup
              key={label}
              label={label}
              discrepancies={items}
              onReviewed={() => refetch()}
            />
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowReviewed((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showReviewed ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
            Reviewed decisions ({reviewed.length})
          </button>
          {showReviewed && (
            <div className="space-y-3">
              {reviewedGroups.map(([label, items]) => (
                <DiscrepancyGroup
                  key={label}
                  label={label}
                  discrepancies={items}
                  onReviewed={() => refetch()}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
