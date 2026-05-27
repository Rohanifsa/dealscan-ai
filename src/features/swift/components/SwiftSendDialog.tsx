"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/provider";

interface SwiftSendDialogProps {
  messageId: string;
  workflowId: string;
  recipientEmail: string;
  recipientName: string;
  finalContent: string;
  disabled?: boolean;
}

export function SwiftSendDialog({
  messageId,
  workflowId,
  recipientEmail,
  recipientName,
  finalContent,
  disabled,
}: SwiftSendDialogProps) {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  const sendMutation = trpc.swift.approveAndSend.useMutation({
    onSuccess: () => {
      toast.success(
        `Email sent to ${recipientEmail.split(",").length > 1 ? `${recipientEmail.split(",").length} recipients` : recipientEmail.trim()}`,
      );
      utils.swift.getByWorkflow.invalidate({ workflowId });
      utils.workflows.getById.invalidate({ id: workflowId });
      setOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        disabled={disabled}
      >
        <Send className="size-3.5" />
        Approve &amp; Send
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send Discrepancy Email?</AlertDialogTitle>
          <AlertDialogDescription>
            This will send the email to{" "}
            <span className="font-medium">
              {recipientEmail.includes(",")
                ? `${recipientEmail.split(",").length} recipients`
                : recipientEmail.trim()}
            </span>
            . This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={sendMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={sendMutation.isPending}
            onClick={() =>
              sendMutation.mutate({
                id: messageId,
                workflowId,
                recipientEmail: recipientEmail || undefined,
                recipientName: recipientName || undefined,
                finalContent: finalContent || undefined,
              })
            }
          >
            {sendMutation.isPending ? "Sending..." : "Send Email"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
