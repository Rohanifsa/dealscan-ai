"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/lib/trpc/provider";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface Member {
  id: string;
  role: string;
  profile: Profile | null;
}

interface Discrepancy {
  field: string;
  ucp_article: string;
  severity: string;
  lc_value: string;
  document_value: string;
  ai_reasoning: string | null;
}

interface TicketSidebarProps {
  ticketId: string;
  workflowId: string;
  status: string;
  priority: string;
  discrepancy: Discrepancy | null;
  members: Member[];
  createdAt: string;
}

const SEVERITY_CLASS: Record<string, string> = {
  HIGH: "text-red-600",
  MEDIUM: "text-amber-600",
  LOW: "text-blue-500",
};

export function TicketSidebar({
  ticketId,
  workflowId,
  status,
  priority,
  discrepancy,
  members,
  createdAt,
}: TicketSidebarProps) {
  const utils = trpc.useUtils();

  const updateStatus = trpc.tickets.updateStatus.useMutation({
    onSuccess: () => {
      utils.tickets.getById.invalidate({ id: ticketId });
      utils.tickets.getByWorkflow.invalidate({ workflowId });
    },
    onError: (err) => toast.error(err.message),
  });

  const updatePriority = trpc.tickets.updatePriority.useMutation({
    onSuccess: () => utils.tickets.getById.invalidate({ id: ticketId }),
    onError: (err) => toast.error(err.message),
  });

  const addMember = trpc.tickets.addMember.useMutation({
    onSuccess: () => {
      toast.success("Member added.");
      utils.tickets.getById.invalidate({ id: ticketId });
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMember = trpc.tickets.removeMember.useMutation({
    onSuccess: () => utils.tickets.getById.invalidate({ id: ticketId }),
    onError: (err) => toast.error(err.message),
  });

  const { data: allUsers } = trpc.tickets.listUsers.useQuery();

  const existingUserIds = new Set(
    members.map((m) => m.profile?.id).filter(Boolean),
  );
  const availableUsers = (allUsers ?? []).filter(
    (u) => !existingUserIds.has(u.id),
  );

  return (
    <div className="space-y-6 text-sm">
      {/* Status */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">
          Status
        </Label>
        <Select
          value={status}
          onValueChange={(val) =>
            updateStatus.mutate({ id: ticketId, status: val as any })
          }
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="AWAITING_REPLY">Awaiting Reply</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">
          Priority
        </Label>
        <Select
          value={priority}
          onValueChange={(val) =>
            updatePriority.mutate({ id: ticketId, priority: val as any })
          }
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Red flag details */}
      {discrepancy && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Red Flag
          </Label>
          <div className="rounded-md border bg-muted/30 p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Field</span>
              <span className="font-medium">{discrepancy.field}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Diligence Check</span>
              <span className="font-medium">{discrepancy.ucp_article}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Severity</span>
              <span
                className={`font-semibold ${SEVERITY_CLASS[discrepancy.severity] ?? ""}`}
              >
                {discrepancy.severity}
              </span>
            </div>
            <hr className="border-border" />
            <div>
              <p className="text-muted-foreground mb-0.5">CIM / Source Value</p>
              <p className="font-medium break-words">{discrepancy.lc_value}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Doc Shows</p>
              <p className="font-medium break-words">
                {discrepancy.document_value}
              </p>
            </div>
            {discrepancy.ai_reasoning && (
              <div>
                <p className="text-muted-foreground mb-0.5">Analysis</p>
                <p className="leading-relaxed">{discrepancy.ai_reasoning}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Members */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Members
          </Label>
          <Popover>
            <PopoverTrigger className="inline-flex size-6 items-center justify-center rounded hover:bg-muted transition-colors">
              <UserPlus className="size-3.5" />
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="end">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1 mb-1">
                Add member
              </p>
              {availableUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-1">
                  All users already added
                </p>
              ) : (
                <div className="space-y-0.5">
                  {availableUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                      onClick={() =>
                        addMember.mutate({
                          ticketId,
                          userId: user.id,
                          role: "WATCHER",
                        })
                      }
                    >
                      <div className="size-6 rounded-full bg-muted border flex items-center justify-center shrink-0 text-[10px] font-medium uppercase">
                        {(user.full_name ?? user.email ?? "?")[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium leading-none">
                          {user.full_name ?? user.email}
                        </p>
                        {user.full_name && (
                          <p className="truncate text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {members.length === 0 ? (
          <p className="text-xs text-muted-foreground">No members assigned.</p>
        ) : (
          <div className="space-y-1.5">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-2">
                <div className="size-7 rounded-full bg-muted border flex items-center justify-center shrink-0 overflow-hidden">
                  {member.profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.profile.avatar_url}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] font-medium uppercase">
                      {
                        (member.profile?.full_name ??
                          member.profile?.email ??
                          "?")[0]
                      }
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">
                    {member.profile?.full_name ?? member.profile?.email}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {member.role}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  onClick={() => removeMember.mutate({ memberId: member.id })}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Created at */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">
          Created
        </Label>
        <p className="text-xs text-muted-foreground">
          {new Date(createdAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}
