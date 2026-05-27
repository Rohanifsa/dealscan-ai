"use client";

import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Send, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc/provider";

interface TicketMessage {
  id: string;
  ticket_id: string;
  direction: "OUTBOUND" | "INBOUND";
  from_email: string;
  from_name: string | null;
  to_emails: string;
  subject: string | null;
  body: string;
  sent_at: string | null;
  is_draft: boolean;
  created_at: string;
}

interface TicketThreadProps {
  ticketId: string;
  workflowId: string;
  subject: string;
  messages: TicketMessage[];
}

export function TicketThread({
  ticketId,
  workflowId,
  subject,
  messages,
}: TicketThreadProps) {
  const utils = trpc.useUtils();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Draft message state (editing the first outbound draft or composing new reply)
  const draft = messages.find((m) => m.is_draft && m.direction === "OUTBOUND");
  const sentMessages = messages.filter((m) => !m.is_draft);

  const [replyMode, setReplyMode] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replyTo, setReplyTo] = useState("");

  // Draft editing state
  const [draftBody, setDraftBody] = useState(draft?.body ?? "");
  const [draftTo, setDraftTo] = useState(draft?.to_emails ?? "");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const updateDraftMutation = trpc.tickets.updateDraft.useMutation({
    onSuccess: () => {
      toast.success("Draft saved.");
      utils.tickets.getById.invalidate({ id: ticketId });
    },
    onError: (err) => toast.error(err.message),
  });

  const sendMutation = trpc.tickets.sendMessage.useMutation({
    onSuccess: () => {
      toast.success("Email sent.");
      setReplyMode(false);
      setReplyBody("");
      setReplyTo("");
      utils.tickets.getById.invalidate({ id: ticketId });
      utils.tickets.getByWorkflow.invalidate({ workflowId });
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Sent messages */}
      {sentMessages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {/* Draft (first AI draft, unsent) */}
      {draft && (
        <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs text-amber-700 border-amber-300"
            >
              Draft
            </Badge>
            <span className="text-xs text-muted-foreground">
              AI-generated — review before sending
            </span>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">To (comma-separated)</Label>
            <Input
              value={draftTo}
              onChange={(e) => setDraftTo(e.target.value)}
              placeholder="correspondent@bank.com, another@bank.com"
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Email body</Label>
            <Textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              className="min-h-[200px] text-sm leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={updateDraftMutation.isPending}
              onClick={() =>
                updateDraftMutation.mutate({
                  messageId: draft.id,
                  body: draftBody,
                  toEmails: draftTo,
                })
              }
            >
              <Pencil className="mr-1.5 size-3.5" />
              {updateDraftMutation.isPending ? "Saving…" : "Save Draft"}
            </Button>
            <Button
              size="sm"
              disabled={
                sendMutation.isPending || !draftTo.trim() || !draftBody.trim()
              }
              onClick={() =>
                sendMutation.mutate({
                  ticketId,
                  messageId: draft.id,
                  body: draftBody,
                  toEmails: draftTo,
                  subject,
                })
              }
            >
              <Send className="mr-1.5 size-3.5" />
              {sendMutation.isPending ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      )}

      {/* Sent + Reply composer */}
      {sentMessages.length > 0 && (
        <>
          <Separator />
          {replyMode ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">To (comma-separated)</Label>
                <Input
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  placeholder="correspondent@bank.com"
                  className="text-sm"
                  autoFocus
                />
              </div>
              <Textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Write your reply…"
                className="min-h-[140px] text-sm leading-relaxed"
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  disabled={
                    sendMutation.isPending ||
                    !replyTo.trim() ||
                    !replyBody.trim()
                  }
                  onClick={() =>
                    sendMutation.mutate({
                      ticketId,
                      body: replyBody,
                      toEmails: replyTo,
                      subject: `Re: ${subject}`,
                    })
                  }
                >
                  <Send className="mr-1.5 size-3.5" />
                  {sendMutation.isPending ? "Sending…" : "Send Reply"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyMode(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReplyMode(true)}
            >
              <Pencil className="mr-1.5 size-3.5" />
              Compose Reply
            </Button>
          )}
        </>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({ message }: { message: TicketMessage }) {
  const isOutbound = message.direction === "OUTBOUND";
  const time = message.sent_at ?? message.created_at;

  return (
    <div
      className={`flex flex-col gap-1 ${isOutbound ? "items-end" : "items-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 text-sm ${
          isOutbound
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground border"
        }`}
      >
        {/* Header */}
        <div
          className={`mb-2 flex items-center gap-2 text-xs ${isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"}`}
        >
          <span className="font-medium">
            {message.from_name ?? message.from_email}
          </span>
          {message.to_emails && (
            <>
              <span>→</span>
              <span className="truncate max-w-[160px]">
                {message.to_emails}
              </span>
            </>
          )}
        </div>
        {/* Body */}
        <p className="whitespace-pre-wrap leading-relaxed">{message.body}</p>
      </div>
      {/* Timestamp */}
      <span className="text-[11px] text-muted-foreground px-1">
        {format(new Date(time), "MMM d, yyyy · h:mm a")}
      </span>
    </div>
  );
}
