"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Save, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SwiftSendDialog } from "./SwiftSendDialog";
import { trpc } from "@/lib/trpc/provider";

interface Recipient {
  email: string;
  name: string;
}

interface SwiftDraftEditorProps {
  messageId: string;
  workflowId: string;
  initialContent: string;
  initialRecipientEmail: string | null;
  initialRecipientName: string | null;
  status: string;
}

function parseRecipients(
  emails: string | null,
  names: string | null,
): Recipient[] {
  const emailList = (emails ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const nameList = (names ?? "").split(",").map((s) => s.trim());
  if (emailList.length === 0) return [{ email: "", name: "" }];
  return emailList.map((email, i) => ({ email, name: nameList[i] ?? "" }));
}

export function SwiftDraftEditor({
  messageId,
  workflowId,
  initialContent,
  initialRecipientEmail,
  initialRecipientName,
  status,
}: SwiftDraftEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [recipients, setRecipients] = useState<Recipient[]>(
    parseRecipients(initialRecipientEmail, initialRecipientName),
  );

  const utils = trpc.useUtils();

  const saveMutation = trpc.swift.updateDraft.useMutation({
    onSuccess: () => {
      toast.success("Draft saved.");
      utils.swift.getByWorkflow.invalidate({ workflowId });
    },
    onError: (err) => toast.error(err.message),
  });

  const isSent = status === "SENT";
  const isReadOnly = isSent;

  const recipientEmail = recipients
    .map((r) => r.email)
    .filter(Boolean)
    .join(", ");
  const recipientName = recipients.map((r) => r.name).join(", ");

  function updateRecipient(
    index: number,
    field: keyof Recipient,
    value: string,
  ) {
    setRecipients((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  }

  function addRecipient() {
    setRecipients((prev) => [...prev, { email: "", name: "" }]);
  }

  function removeRecipient(index: number) {
    setRecipients((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      {/* Recipients */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Recipients</Label>
          {!isReadOnly && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={addRecipient}
            >
              <Plus className="size-3.5" />
              Add Recipient
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {recipients.map((recipient, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <Input
                  type="email"
                  value={recipient.email}
                  onChange={(e) =>
                    updateRecipient(index, "email", e.target.value)
                  }
                  placeholder="correspondent@bank.com"
                  disabled={isReadOnly}
                  aria-label={`Recipient ${index + 1} email`}
                />
                <Input
                  value={recipient.name}
                  onChange={(e) =>
                    updateRecipient(index, "name", e.target.value)
                  }
                  placeholder="Correspondent Bank"
                  disabled={isReadOnly}
                  aria-label={`Recipient ${index + 1} name`}
                />
              </div>
              {!isReadOnly && recipients.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-0.5 size-9 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeRecipient(index)}
                  aria-label="Remove recipient"
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`content-${messageId}`}>Email Content</Label>
        <Textarea
          id={`content-${messageId}`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[240px] text-sm leading-relaxed"
          disabled={isReadOnly}
        />
      </div>

      {!isReadOnly && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={saveMutation.isPending}
            onClick={() =>
              saveMutation.mutate({
                id: messageId,
                workflowId,
                finalContent: content,
                recipientEmail: recipientEmail || undefined,
                recipientName: recipientName || undefined,
              })
            }
          >
            <Save className="mr-1.5 size-3.5" data-icon="inline-start" />
            {saveMutation.isPending ? "Saving..." : "Save Draft"}
          </Button>

          <SwiftSendDialog
            messageId={messageId}
            workflowId={workflowId}
            recipientEmail={recipientEmail}
            recipientName={recipientName}
            finalContent={content}
            disabled={!recipientEmail || !content}
          />
        </div>
      )}

      {isSent && (
        <p className="text-muted-foreground text-xs">
          This message has been sent and cannot be edited.
        </p>
      )}
    </div>
  );
}
