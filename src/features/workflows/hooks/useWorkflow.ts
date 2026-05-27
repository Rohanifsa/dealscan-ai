"use client";

import { trpc } from "@/lib/trpc/provider";

export function useWorkflow(id: string) {
  return trpc.workflows.getById.useQuery({ id });
}
