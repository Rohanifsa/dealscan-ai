"use client";

import { use, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { RefreshCw, Paperclip, Mail, Play } from "lucide-react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

const DOC_TYPE_LABELS: Record<string, string> = {
  LC: "CIM",
  INVOICE: "Financials",
  BILL_OF_LADING: "Management Accounts",
  UNKNOWN: "Unknown",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function WorkflowEmailsPage({ params }: PageProps) {
  const { id: workflowId } = use(params);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.emails.getThreadEmails.useQuery({
    workflowId,
  });

  const { data: workflow } = trpc.workflows.getById.useQuery({ id: workflowId });

  const [syncResult, setSyncResult] = useState<{
    newMessages: number;
    newDocuments: number;
    replacedDocuments: number;
  } | null>(null);

  const syncMutation = trpc.emails.syncThread.useMutation({
    onSuccess: (result) => {
      setSyncResult(result);
      if (result.newMessages === 0) {
        toast.info("Thread is already up to date.");
      } else {
        const parts: string[] = [`${result.newMessages} new email(s)`];
        if (result.newDocuments > 0)
          parts.push(`${result.newDocuments} new document(s)`);
        if (result.replacedDocuments > 0)
          parts.push(`${result.replacedDocuments} replaced document(s)`);
        toast.success(`Synced: ${parts.join(", ")}.`);
      }
      utils.emails.getThreadEmails.invalidate({ workflowId });
      utils.workflows.getById.invalidate({ id: workflowId });
      utils.documents.getByWorkflow.invalidate({ workflowId });
    },
    onError: (err) => toast.error(err.message),
  });

  const processMutation = trpc.documents.triggerProcessing.useMutation({
    onSuccess: () => {
      toast.success("Analysis started.");
      setSyncResult(null);
      utils.workflows.getById.invalidate({ id: workflowId });
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  const { threadId, emails } = data ?? { threadId: null, emails: [] };
  const hasDocChanges =
    syncResult &&
    (syncResult.newDocuments > 0 || syncResult.replacedDocuments > 0);
  const isProcessing =
    workflow?.status === "EXTRACTING" || workflow?.status === "VALIDATING";

  if (!threadId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Mail className="size-10 text-muted-foreground mb-4" />
        <p className="font-medium">No email thread linked</p>
        <p className="text-sm text-muted-foreground mt-1">
          This deal was not created from an email. Upload documents manually on
          the Documents page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Email Thread</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {emails.length} message{emails.length !== 1 ? "s" : ""} in thread
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={syncMutation.isPending || isProcessing}
          onClick={() => syncMutation.mutate({ workflowId })}
        >
          <RefreshCw
            className={`mr-1.5 size-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`}
          />
          {syncMutation.isPending ? "Syncing…" : "Sync Thread"}
        </Button>
      </div>

      {/* Processing alert */}
      {isProcessing && (
        <Alert>
          <Info className="size-4" />
          <AlertDescription>
            Document analysis is currently running. Wait for it to complete
            before syncing new documents.
          </AlertDescription>
        </Alert>
      )}

      {/* Sync result banner */}
      {hasDocChanges && workflow?.status === "PENDING" && (
        <Alert className="border-amber-300 bg-amber-50/40">
          <Info className="size-4 text-amber-600" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span className="text-amber-800">
              {syncResult!.newDocuments > 0 && (
                <>{syncResult!.newDocuments} new document(s) added. </>
              )}
              {syncResult!.replacedDocuments > 0 && (
                <>{syncResult!.replacedDocuments} document(s) replaced. </>
              )}
              Re-run analysis to process the updated documents.
            </span>
            <Button
              size="sm"
              disabled={processMutation.isPending}
              onClick={() => processMutation.mutate({ workflowId })}
            >
              <Play className="mr-1.5 size-3.5" />
              {processMutation.isPending ? "Starting…" : "Re-run Analysis"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Email list */}
      <div className="space-y-3">
        {emails.map((email, idx) => {
          type AttachmentMeta = {
            filename: string;
            inferred_doc_type: string;
            size?: number;
          };
          const attachments = (email.attachment_meta ?? []) as AttachmentMeta[];
          const knowableAttachments = attachments.filter(
            (a) => a.inferred_doc_type !== "UNKNOWN",
          );

          return (
            <div
              key={email.id}
              className="rounded-lg border bg-card p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground">
                      #{idx + 1}
                    </span>
                    <p className="font-medium text-sm truncate">
                      {email.subject ?? "(no subject)"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    From: {email.from_address}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {email.received_at
                    ? format(new Date(email.received_at), "MMM d, yyyy · h:mm a")
                    : ""}
                </span>
              </div>

              {email.snippet && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {email.snippet}
                </p>
              )}

              {knowableAttachments.length > 0 && (
                <>
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    {knowableAttachments.map((att, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="gap-1 text-xs font-normal"
                      >
                        <Paperclip className="size-3" />
                        {att.filename}
                        <span className="text-muted-foreground">
                          — {DOC_TYPE_LABELS[att.inferred_doc_type] ?? att.inferred_doc_type}
                        </span>
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
