"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type WorkflowStatus =
  | "PENDING"
  | "EXTRACTING"
  | "VALIDATING"
  | "HUMAN_REVIEW_REQUIRED"
  | "RESOLVED"
  | "FAILED";

const STATUS_CONFIG: Record<
  WorkflowStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  PENDING: { label: "Pending", variant: "secondary" },
  EXTRACTING: { label: "Extracting", variant: "default" },
  VALIDATING: { label: "Validating", variant: "default" },
  HUMAN_REVIEW_REQUIRED: { label: "Review Required", variant: "outline" },
  RESOLVED: { label: "Resolved", variant: "default" },
  FAILED: { label: "Failed", variant: "destructive" },
};

interface WorkflowStatusBadgeProps {
  status: WorkflowStatus;
  className?: string;
}

export function WorkflowStatusBadge({
  status,
  className,
}: WorkflowStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <Badge
      variant={config.variant}
      className={cn(
        status === "RESOLVED" && "bg-green-600 text-white hover:bg-green-700",
        status === "HUMAN_REVIEW_REQUIRED" && "border-amber-500 text-amber-600",
        status === "EXTRACTING" && "bg-blue-600 text-white hover:bg-blue-700",
        status === "VALIDATING" &&
          "bg-violet-600 text-white hover:bg-violet-700",
        className,
      )}
    >
      {config.label}
    </Badge>
  );
}
