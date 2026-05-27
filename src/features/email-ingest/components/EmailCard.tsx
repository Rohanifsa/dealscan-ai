"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Paperclip,
  Mail,
  MailOpen,
  Ban,
  ExternalLink,
  ChevronRight,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc/provider";
import { CreateTradeFromEmailDrawer } from "./CreateTradeFromEmailDrawer";

export type AttachmentMeta = {
  filename: string;
  inferred_doc_type: "LC" | "INVOICE" | "BILL_OF_LADING" | "UNKNOWN";
  size?: number;
  attachmentId?: string;
};

export type EmailEvent = {
  id: string;
  message_id: string;
  thread_id: string;
  from_address: string;
  subject: string | null;
  snippet: string | null;
  received_at: string;
  status: "NEW" | "TRADE_CREATED" | "IGNORED";
  attachment_meta: AttachmentMeta[];
  workflow_id: string | null;
  workflows?: { id: string; name: string; status: string } | null;
};

const docTypeLabels: Record<string, string> = {
  LC: "CIM",
  INVOICE: "Financials",
  BILL_OF_LADING: "Management Accounts",
  UNKNOWN: "Unknown",
};

const docTypeBadgeVariant: Record<string, "default" | "secondary" | "outline"> =
  {
    LC: "default",
    INVOICE: "secondary",
    BILL_OF_LADING: "secondary",
    UNKNOWN: "outline",
  };

const statusConfig = {
  NEW: { label: "New", variant: "default" as const },
  TRADE_CREATED: { label: "Deal Created", variant: "secondary" as const },
  IGNORED: { label: "Ignored", variant: "outline" as const },
};

interface EmailCardProps {
  email: EmailEvent;
}

export function EmailCard({ email }: EmailCardProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const ignoreMutation = trpc.emails.ignore.useMutation({
    onSuccess: () => {
      utils.emails.getAll.invalidate();
      toast.success("Email ignored");
    },
    onError: (err) => toast.error(err.message),
  });

  const attachments = Array.isArray(email.attachment_meta)
    ? (email.attachment_meta as AttachmentMeta[])
    : [];

  const cfg = statusConfig[email.status];

  return (
    <>
      <Card
        className={`transition-colors ${email.status === "NEW" ? "border-primary/30 hover:bg-accent/40 cursor-pointer" : "opacity-70"}`}
        onClick={() => email.status === "NEW" && setDrawerOpen(true)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {email.status === "NEW" ? (
                <Mail className="size-4 text-primary shrink-0" />
              ) : (
                <MailOpen className="size-4 text-muted-foreground shrink-0" />
              )}
              <span className="font-medium text-sm truncate">
                {email.subject ?? "(no subject)"}
              </span>
            </div>
            <Badge variant={cfg.variant} className="shrink-0 text-xs">
              {cfg.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            From: {email.from_address}
          </p>
        </CardHeader>

        {email.snippet && (
          <CardContent className="pb-2 pt-0">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {email.snippet}
            </p>
          </CardContent>
        )}

        {attachments.length > 0 && (
          <CardContent className="pb-2 pt-0">
            <div className="flex flex-wrap gap-1">
              {attachments.map((att, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-[10px]"
                >
                  <FileText className="size-2.5 shrink-0 text-muted-foreground" />
                  <span className="truncate max-w-[120px]">{att.filename}</span>
                  <Badge
                    variant={
                      docTypeBadgeVariant[att.inferred_doc_type] ?? "outline"
                    }
                    className="text-[9px] h-4 px-1.5 ml-0.5"
                  >
                    {docTypeLabels[att.inferred_doc_type] ??
                      att.inferred_doc_type}
                  </Badge>
                </span>
              ))}
            </div>
          </CardContent>
        )}

        <CardFooter className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {formatDistanceToNow(new Date(email.received_at), {
                addSuffix: true,
              })}
            </span>
          </div>

          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {email.status === "TRADE_CREATED" && email.workflows && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => router.push(`/workflow/${email.workflows!.id}`)}
              >
                View Deal
                <ExternalLink className="size-3" />
              </Button>
            )}
            {email.status === "NEW" && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() =>
                    ignoreMutation.mutate({ messageId: email.message_id })
                  }
                  disabled={ignoreMutation.isPending}
                >
                  <Ban className="size-3" />
                  Ignore
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setDrawerOpen(true)}
                >
                  Create Deal
                  <ChevronRight className="size-3" />
                </Button>
              </>
            )}
          </div>
        </CardFooter>
      </Card>

      <CreateTradeFromEmailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        email={email}
      />
    </>
  );
}
