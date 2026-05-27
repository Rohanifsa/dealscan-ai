"use client";

import { use } from "react";
import { useTickets } from "@/features/tickets/hooks/useTickets";
import { TicketList } from "@/features/tickets/components/TicketList";
import { Skeleton } from "@/components/ui/skeleton";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TicketsPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: tickets, isLoading, error } = useTickets(id);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-destructive text-sm">
        Failed to load management queries: {error.message}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold">Management Queries</h2>
        <p className="text-muted-foreground text-sm">
          Each reviewed red flag can generate a query thread for management
          clarification.
        </p>
      </div>

      <TicketList tickets={tickets ?? []} workflowId={id} />
    </div>
  );
}
