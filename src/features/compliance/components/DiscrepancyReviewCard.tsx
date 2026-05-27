"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { reviewDemoDiscrepancy } from "@/lib/demoStore";

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
}

interface DiscrepancyReviewCardProps {
  discrepancy: Discrepancy;
  expanded: boolean;
  onToggle: () => void;
  onReviewed: () => void;
}

const VERDICT_STYLES: Record<string, string> = {
  PASS: "bg-green-100 text-green-700 border-green-200",
  FAIL: "bg-red-100 text-red-700 border-red-200",
};

const VERDICT_LABELS: Record<string, string> = {
  PASS: "Correct",
  FAIL: "Mismatch",
};

export function DiscrepancyReviewCard({
  discrepancy,
  expanded,
  onToggle,
  onReviewed,
}: DiscrepancyReviewCardProps) {
  const [note, setNote] = useState(discrepancy.analyst_note ?? "");

  const [isPending, setIsPending] = useState(false);

  function handleReview(approved: boolean) {
    setIsPending(true);
    reviewDemoDiscrepancy({
      id: discrepancy.id,
      workflowId: discrepancy.workflow_id,
      approved,
      analystNote: note,
    });
    toast.success(
      approved ? "Red flag cleared." : "Management query generated.",
    );
    setIsPending(false);
    onReviewed();
  }
  // isApproved / isRejected only when a human has explicitly made a decision
  const isApproved =
    discrepancy.status === "APPROVED" && !!discrepancy.resolved_by;
  const isRejected =
    discrepancy.status === "DISCREPANCY" && !!discrepancy.resolved_by;
  // Show review actions for ALL items not yet reviewed by a human
  const showReviewActions = !discrepancy.resolved_by;

  return (
    <div className="p-4">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 text-left"
      >
        {expanded ? (
          <ChevronDown className="text-muted-foreground size-4 shrink-0" />
        ) : (
          <ChevronRight className="text-muted-foreground size-4 shrink-0" />
        )}

        <div className="flex flex-1 flex-wrap items-center gap-2">
          <span className="font-medium">{discrepancy.field}</span>
          <span className="text-muted-foreground text-xs">
            {discrepancy.ucp_article}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isApproved && (
            <Badge
              variant="outline"
              className="border-green-300 text-green-700"
            >
              <CheckCircle className="mr-1 size-3" />
              Approved
            </Badge>
          )}
          {isRejected && (
            <Badge variant="outline" className="border-red-300 text-red-700">
              <XCircle className="mr-1 size-3" />
              Rejected
            </Badge>
          )}
          <span
            className={`rounded border px-1.5 py-0.5 text-xs font-medium ${
              VERDICT_STYLES[discrepancy.rules_verdict] ?? ""
            }`}
          >
            {VERDICT_LABELS[discrepancy.rules_verdict] ??
              discrepancy.rules_verdict}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 pl-7">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                CIM / Source Value
              </p>
              <p className="rounded bg-muted p-2 font-mono text-xs">
                {discrepancy.lc_value || "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                Document Value
              </p>
              <p className="rounded bg-muted p-2 font-mono text-xs">
                {discrepancy.document_value || "—"}
              </p>
            </div>
          </div>

          <div className="flex gap-4 text-xs">
            <span>
              <span className="text-muted-foreground">Rules: </span>
              <span
                className={`font-medium ${discrepancy.rules_verdict === "PASS" ? "text-green-600" : "text-red-600"}`}
              >
                {discrepancy.rules_verdict}
              </span>
            </span>
            {discrepancy.ai_verdict && (
              <span>
                <span className="text-muted-foreground">AI: </span>
                <span
                  className={`font-medium ${discrepancy.ai_verdict === "PASS" ? "text-green-600" : "text-red-600"}`}
                >
                  {discrepancy.ai_verdict}
                </span>
              </span>
            )}
            {discrepancy.fuzzy_score != null && (
              <span>
                <span className="text-muted-foreground">Fuzzy: </span>
                <span className="font-medium">{discrepancy.fuzzy_score}%</span>
              </span>
            )}
          </div>

          {showReviewActions && (
            <div className="space-y-2">
              <Label htmlFor={`note-${discrepancy.id}`} className="text-xs">
                Analyst Note (optional)
              </Label>
              <Textarea
                id={`note-${discrepancy.id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note explaining your decision..."
                className="min-h-[72px] resize-none text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-50"
                  disabled={isPending}
                  onClick={() =>
                    handleReview(true)
                  }
                >
                  <CheckCircle
                    className="mr-1.5 size-3.5"
                    data-icon="inline-start"
                  />
                  Clear
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  disabled={isPending}
                  onClick={() =>
                    handleReview(false)
                  }
                >
                  <XCircle
                    className="mr-1.5 size-3.5"
                    data-icon="inline-start"
                  />
                  Raise Query
                </Button>
              </div>
            </div>
          )}

          {discrepancy.analyst_note && (isApproved || isRejected) && (
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium">
                Analyst Note
              </p>
              <p className="text-muted-foreground rounded bg-muted p-2 text-xs">
                {discrepancy.analyst_note}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
