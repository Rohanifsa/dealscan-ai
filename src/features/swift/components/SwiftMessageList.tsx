"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { SwiftDraftEditor } from "./SwiftDraftEditor";
import { Separator } from "@/components/ui/separator";

interface SwiftMessage {
  id: string;
  workflow_id: string;
  status: string;
  draft_content: string | null;
  final_content: string | null;
  recipient_email: string | null;
  recipient_name: string | null;
  discrepancy?: {
    field_name: string;
    ucp_article: string;
    severity: string;
  };
}

interface SwiftMessageListProps {
  messages: SwiftMessage[];
  workflowId: string;
}

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "secondary",
  APPROVED: "default",
  SENT: "default",
  FAILED: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  SENT: "Sent",
  FAILED: "Failed",
};

export function SwiftMessageList({
  messages,
  workflowId,
}: SwiftMessageListProps) {
  if (messages.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No emails generated yet</EmptyTitle>
          <EmptyDescription>
            Discrepancy emails will appear here once compliance review is
            complete and discrepancies are identified.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-6">
      {messages.map((msg, index) => (
        <Card key={msg.id}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="space-y-0.5">
              <CardTitle className="text-base">
                Discrepancy Email {index + 1}
              </CardTitle>
              {msg.discrepancy && (
                <p className="text-muted-foreground text-xs">
                  Re: {msg.discrepancy.field_name} · Art.{" "}
                  {msg.discrepancy.ucp_article}
                  {" · "}
                  <span
                    className={
                      msg.discrepancy.severity === "HIGH"
                        ? "text-red-600"
                        : msg.discrepancy.severity === "MEDIUM"
                          ? "text-amber-600"
                          : "text-blue-600"
                    }
                  >
                    {msg.discrepancy.severity}
                  </span>
                </p>
              )}
            </div>
            <Badge variant={STATUS_VARIANT[msg.status] ?? "outline"}>
              {STATUS_LABELS[msg.status] ?? msg.status}
            </Badge>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <SwiftDraftEditor
              messageId={msg.id}
              workflowId={workflowId}
              initialContent={msg.final_content ?? msg.draft_content ?? ""}
              initialRecipientEmail={msg.recipient_email}
              initialRecipientName={msg.recipient_name}
              status={msg.status}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
