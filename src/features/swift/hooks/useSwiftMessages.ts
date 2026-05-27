"use client";

import { trpc } from "@/lib/trpc/provider";

export function useSwiftMessages(workflowId: string) {
  return trpc.swift.getByWorkflow.useQuery({ workflowId });
}
