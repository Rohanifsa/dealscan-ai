"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DiscrepancyReviewCard } from "./DiscrepancyReviewCard";

interface Discrepancy {
  id: string;
  workflow_id: string;
  field: string;
  ucp_article: string;
  lc_value: string | null;
  document_value: string | null;
  fuzzy_score: number | null;
  rules_verdict: string;
  ai_verdict: string | null;
  severity: string;
  status: string;
  analyst_note: string | null;
  resolved_by?: string | null;
  source_doc?: { file_name: string; type: string };
  compare_doc?: { file_name: string; type: string };
}

interface DiscrepancyGroupProps {
  label: string;
  discrepancies: Discrepancy[];
  onReviewed: () => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  HIGH: "text-red-600 bg-red-50 border-red-200",
  MEDIUM: "text-amber-600 bg-amber-50 border-amber-200",
  LOW: "text-blue-600 bg-blue-50 border-blue-200",
};

export function DiscrepancyGroup({
  label,
  discrepancies,
  onReviewed,
}: DiscrepancyGroupProps) {
  const [expanded, setExpanded] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pendingCount = discrepancies.filter((d) => !d.resolved_by).length;

  return (
    <div className="rounded-lg border">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50"
      >
        {expanded ? (
          <ChevronDown className="text-muted-foreground size-4 shrink-0" />
        ) : (
          <ChevronRight className="text-muted-foreground size-4 shrink-0" />
        )}
        <span className="flex-1 font-medium">{label}</span>
        <div className="flex gap-2">
          {pendingCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {pendingCount} pending
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {discrepancies.length} field{discrepancies.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </button>

      {expanded && (
        <div className="divide-y border-t">
          {discrepancies.map((d) => (
            <DiscrepancyReviewCard
              key={d.id}
              discrepancy={d}
              expanded={expandedId === d.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === d.id ? null : d.id))
              }
              onReviewed={onReviewed}
            />
          ))}
        </div>
      )}
    </div>
  );
}
