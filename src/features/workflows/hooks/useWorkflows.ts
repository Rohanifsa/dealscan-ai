"use client";

import { trpc } from "@/lib/trpc/provider";

export function useWorkflows() {
  return trpc.workflows.getAll.useQuery();
}
