"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTicket } from "@/features/tickets/hooks/useTickets";
import { TicketThread } from "@/features/tickets/components/TicketThread";
import { TicketSidebar } from "@/features/tickets/components/TicketSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  params: Promise<{ id: string; ticketId: string }>;
}

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  OPEN: "secondary",
  IN_PROGRESS: "default",
  AWAITING_REPLY: "outline",
  RESOLVED: "default",
  CLOSED: "secondary",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  AWAITING_REPLY: "Awaiting Reply",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export default function TicketDetailPage({ params }: PageProps) {
  const { id: workflowId, ticketId } = use(params);
  const { data: ticket, isLoading } = useTicket(ticketId);

  if (isLoading) {
    return (
      <div className="flex gap-6">
        <div className="flex-1 space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <div className="w-64 shrink-0 space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link
        href={`/workflow/${workflowId}/tickets`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        All Tickets
      </Link>

      {/* Ticket header */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-base leading-snug">
            {ticket.subject}
          </h2>
          <div className="mt-1 flex items-center gap-2">
            <Badge
              variant={STATUS_VARIANT[ticket.status] ?? "outline"}
              className="text-xs"
            >
              {STATUS_LABELS[ticket.status] ?? ticket.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {(ticket.messages as any[])?.length ?? 0} message
              {((ticket.messages as any[])?.length ?? 0) !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">
        {/* Thread */}
        <div className="min-w-0 flex-1">
          <TicketThread
            ticketId={ticket.id}
            workflowId={workflowId}
            subject={ticket.subject}
            messages={(ticket.messages as any[]) ?? []}
          />
        </div>

        {/* Sidebar */}
        <aside className="w-64 shrink-0">
          <TicketSidebar
            ticketId={ticket.id}
            workflowId={workflowId}
            status={ticket.status}
            priority={ticket.priority}
            discrepancy={(ticket.discrepancy as any) ?? null}
            members={(ticket.members as any[]) ?? []}
            createdAt={ticket.created_at}
          />
        </aside>
      </div>
    </div>
  );
}
