"use client";

import { trpc } from "@/lib/trpc/provider";

export function useTickets(workflowId: string) {
  return trpc.tickets.getByWorkflow.useQuery({ workflowId });
}

export function useTicket(id: string) {
  return trpc.tickets.getById.useQuery({ id });
}
