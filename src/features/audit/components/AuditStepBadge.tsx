"use client";

import { Badge } from "@/components/ui/badge";

interface AuditStepBadgeProps {
  actorType: "HUMAN" | "SYSTEM";
  step: string;
}

const STEP_LABEL: Record<string, string> = {
  WORKFLOW_CREATED: "Workflow Created",
  DOCUMENT_UPLOADED: "Document Uploaded",
  WORKFLOW_TRIGGERED: "Processing Triggered",
  EXTRACTION_STARTED: "Extraction Started",
  EXTRACTION_COMPLETE: "Extraction Complete",
  VALIDATION_STARTED: "Validation Started",
  VALIDATION_COMPLETE: "Validation Complete",
  HUMAN_REVIEW_APPROVED: "Review Approved",
  HUMAN_REVIEW_REJECTED: "Review Rejected",
  SWIFT_GENERATED: "Email Generated",
  SWIFT_EDITED: "Email Edited",
  SWIFT_APPROVED: "Email Approved",
  SWIFT_SENT: "Email Sent",
  SWIFT_SEND_FAILED: "Email Send Failed",
  TICKET_CREATED: "Ticket Created",
  TICKET_EMAIL_SENT: "Email Sent",
  WORKFLOW_RESOLVED: "Workflow Resolved",
  WORKFLOW_FAILED: "Workflow Failed",
};

export function AuditStepBadge({ actorType, step }: AuditStepBadgeProps) {
  const label = STEP_LABEL[step] ?? step;
  const variant = actorType === "HUMAN" ? "default" : "secondary";

  return (
    <Badge variant={variant} className="text-xs">
      {label}
    </Badge>
  );
}
