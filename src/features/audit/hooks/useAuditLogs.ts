"use client";

import { trpc } from "@/lib/trpc/provider";

export function useAuditLogs(workflowId: string) {
  return trpc.audit.getByWorkflow.useQuery({ workflowId });
}
