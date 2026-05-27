"use client";

import { trpc } from "@/lib/trpc/provider";

export function useDocuments(workflowId: string) {
  return trpc.documents.getByWorkflow.useQuery({ workflowId });
}
