"use client";

import { trpc } from "@/lib/trpc/provider";

export function useDiscrepancies(workflowId: string) {
  return trpc.discrepancies.getByWorkflow.useQuery({ workflowId });
}
