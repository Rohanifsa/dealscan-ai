"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Paperclip } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc/provider";
import type { EmailEvent, AttachmentMeta } from "./EmailCard";

const docTypeBadgeVariant: Record<string, "default" | "secondary" | "outline"> =
  {
    LC: "default",
    INVOICE: "secondary",
    BILL_OF_LADING: "secondary",
    UNKNOWN: "outline",
  };

const docTypeLabels: Record<string, string> = {
  LC: "CIM",
  INVOICE: "Financials",
  BILL_OF_LADING: "Management Accounts",
  UNKNOWN: "Unknown",
};

interface CreateTradeFromEmailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: EmailEvent;
}

export function CreateTradeFromEmailDrawer({
  open,
  onOpenChange,
  email,
}: CreateTradeFromEmailDrawerProps) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const defaultName = email.subject
    ? email.subject.replace(/^(re:|fwd?:)\s*/i, "").trim()
    : "";

  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState("");

  const attachments: AttachmentMeta[] = Array.isArray(email.attachment_meta)
    ? (email.attachment_meta as AttachmentMeta[])
    : [];

  const createMutation = trpc.emails.createTradeFromEmail.useMutation({
    onSuccess: (workflow) => {
      utils.emails.getAll.invalidate();
      utils.workflows.getAll.invalidate();
      onOpenChange(false);
      toast.success("Deal created successfully");
      router.push(`/workflow/${workflow.id}/documents`);
    },
    onError: (err) => toast.error(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({
      messageId: email.message_id,
      tradeName: name.trim(),
      description: description.trim() || undefined,
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>Create Deal from Email</SheetTitle>
          <SheetDescription className="text-xs">
            From: {email.from_address}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <FieldGroup>
              <Field>
                <FieldLabel>Deal name</FieldLabel>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter deal name"
                  autoFocus
                />
              </Field>
              <Field>
                <FieldLabel>Description (optional)</FieldLabel>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a short description…"
                  rows={3}
                />
              </Field>
            </FieldGroup>

            {attachments.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Detected attachments</p>
                <div className="space-y-1.5">
                  {attachments.map((att, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate text-xs">{att.filename}</span>
                      </span>
                      <Badge
                        variant={
                          docTypeBadgeVariant[att.inferred_doc_type] ??
                          "outline"
                        }
                        className="ml-2 shrink-0 text-[10px]"
                      >
                        {docTypeLabels[att.inferred_doc_type] ??
                          att.inferred_doc_type}
                      </Badge>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  <Paperclip className="inline size-3 mr-0.5 -mt-0.5" />
                  These documents will be automatically downloaded from the
                  email and registered with the deal. The extraction pipeline
                  will start once all 3 required documents are present.
                </p>
              </div>
            )}
          </div>

          <SheetFooter className="px-6 py-4 border-t mt-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createMutation.isPending}
            >
              {createMutation.isPending && <Spinner className="mr-2 size-4" />}
              Create Deal
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
