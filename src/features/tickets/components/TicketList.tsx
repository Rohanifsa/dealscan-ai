"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, AlertTriangle, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

interface Ticket {
  id: string;
  workflow_id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  messageCount: number;
  discrepancy: {
    field: string;
    ucp_article: string;
    severity: string;
  } | null;
  members: {
    id: string;
    role: string;
    profile: {
      id: string;
      full_name: string | null;
      email: string | null;
      avatar_url: string | null;
    } | null;
  }[];
}

interface TicketListProps {
  tickets: Ticket[];
  workflowId: string;
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

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: "text-red-600",
  MEDIUM: "text-amber-600",
  LOW: "text-blue-500",
};

export function TicketList({ tickets, workflowId }: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No management queries yet</EmptyTitle>
          <EmptyDescription>
            Management queries are created after diligence review identifies
            issues that need clarification.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="divide-y rounded-lg border">
      {tickets.map((ticket) => (
        <Link
          key={ticket.id}
          href={`/workflow/${workflowId}/tickets/${ticket.id}`}
          className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors"
        >
          {/* Priority indicator */}
          <AlertTriangle
            className={`size-4 shrink-0 ${PRIORITY_COLOR[ticket.priority] ?? "text-muted-foreground"}`}
          />

          {/* Main content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium truncate">{ticket.subject}</p>
              <Badge
                variant={STATUS_VARIANT[ticket.status] ?? "outline"}
                className="text-xs shrink-0"
              >
                {STATUS_LABELS[ticket.status] ?? ticket.status}
              </Badge>
            </div>
            <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
              {ticket.discrepancy && (
                <span>
                  {ticket.discrepancy.field} ·{" "}
                  {ticket.discrepancy.ucp_article}
                </span>
              )}
              <span className="flex items-center gap-1">
                <MessageSquare className="size-3" />
                {ticket.messageCount}
              </span>
              <span>
                Updated{" "}
                {formatDistanceToNow(new Date(ticket.updated_at), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>

          {/* Member avatars */}
          {ticket.members.length > 0 && (
            <div className="flex -space-x-1.5 shrink-0">
              {ticket.members.slice(0, 3).map((m) => (
                <div
                  key={m.id}
                  className="size-6 rounded-full bg-muted border-2 border-background flex items-center justify-center overflow-hidden"
                  title={m.profile?.full_name ?? m.profile?.email ?? ""}
                >
                  {m.profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.profile.avatar_url}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="text-[9px] font-medium text-muted-foreground uppercase">
                      {(m.profile?.full_name ?? m.profile?.email ?? "?")[0]}
                    </span>
                  )}
                </div>
              ))}
              {ticket.members.length > 3 && (
                <div className="size-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <span className="text-[9px] font-medium text-muted-foreground">
                    +{ticket.members.length - 3}
                  </span>
                </div>
              )}
            </div>
          )}

          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}
