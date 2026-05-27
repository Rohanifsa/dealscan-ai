"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import type { PageContext } from "@/lib/agents/trade-guard-agent";
import type { DealScanUIMessage } from "@/lib/agents/trade-guard-agent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputTextarea,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import {
  Task,
  TaskContent,
  TaskItem,
  TaskTrigger,
} from "@/components/ai-elements/task";
import {
  Bot,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";

const PAGE_LABELS: Record<string, string> = {
  "workflow-overview": "Deal",
  "workflow-documents": "Documents",
  "workflow-discrepancies": "Red Flags",
  "workflow-tickets": "Queries",
  "ticket-detail": "Query",
};

function parsePageContext(pathname: string): PageContext | undefined {
  // /workflow/[id]/tickets/[ticketId]
  const ticketDetail = pathname.match(
    /\/workflow\/([\w-]+)\/tickets\/([\w-]+)/,
  );
  if (ticketDetail)
    return {
      page: "ticket-detail",
      workflowId: ticketDetail[1],
      ticketId: ticketDetail[2],
    };

  // /workflow/[id]/documents
  const docs = pathname.match(/\/workflow\/([\w-]+)\/documents/);
  if (docs) return { page: "workflow-documents", workflowId: docs[1] };

  // /workflow/[id]/discrepancies
  const disc = pathname.match(/\/workflow\/([\w-]+)\/discrepancies/);
  if (disc) return { page: "workflow-discrepancies", workflowId: disc[1] };

  // /workflow/[id]/tickets
  const tickets = pathname.match(/\/workflow\/([\w-]+)\/tickets/);
  if (tickets) return { page: "workflow-tickets", workflowId: tickets[1] };

  // /workflow/[id]
  const workflow = pathname.match(/\/workflow\/([\w-]+)/);
  if (workflow) return { page: "workflow-overview", workflowId: workflow[1] };

  return undefined;
}

// ── Tool result renderers ─────────────────────────────────────────────────────

type AnyPart = DealScanUIMessage["parts"][number];
type ToolPart = Extract<AnyPart, { type: `tool-${string}`; state: string }>;

function ToolInvocationCard({ part }: { part: ToolPart }) {
  const isDone = part.state === "output-available";

  if (
    part.type === "tool-getDocuments" &&
    isDone &&
    Array.isArray(part.output)
  ) {
    return (
      <Task>
        <TaskTrigger title="Documents" />
        <TaskContent>
          {(part.output as any[]).map((d) => (
            <TaskItem key={d.id}>
              <FileText className="inline size-3 mr-1 shrink-0 text-muted-foreground" />
              <span className="font-medium">{d.file_name}</span>{" "}
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {d.type}
              </Badge>
            </TaskItem>
          ))}
        </TaskContent>
      </Task>
    );
  }

  if (part.type === "tool-getDocumentDetails") {
    return (
      <div className="bg-muted rounded-md p-2 text-xs flex items-center gap-2">
        {isDone ? (
          <>
            <CheckCircle2 className="size-3 text-green-500 shrink-0" />
            <span>Document data loaded</span>
          </>
        ) : (
          <>
            <Loader2 className="size-3 animate-spin shrink-0" />
            <span>Loading document…</span>
          </>
        )}
      </div>
    );
  }

  if (
    part.type === "tool-getWorkflows" &&
    isDone &&
    Array.isArray(part.output)
  ) {
    return (
      <Task>
        <TaskTrigger title="Deals" />
        <TaskContent>
          {(part.output as any[]).map((w) => (
            <TaskItem key={w.id}>
              <span className="font-medium">{w.name}</span>{" "}
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {w.status}
              </Badge>
            </TaskItem>
          ))}
        </TaskContent>
      </Task>
    );
  }

  if (
    part.type === "tool-getDiscrepancies" &&
    isDone &&
    Array.isArray(part.output)
  ) {
    return (
      <Task>
        <TaskTrigger title="Red Flags" />
        <TaskContent>
          {(part.output as any[]).map((d) => (
            <TaskItem key={d.id}>
              <AlertCircle className="inline size-3 text-amber-500 mr-1 shrink-0" />
              <span className="font-medium">{d.field}</span>
              {d.ucp_article ? ` — diligence check ${d.ucp_article}` : ""}{" "}
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {d.status}
              </Badge>
            </TaskItem>
          ))}
        </TaskContent>
      </Task>
    );
  }

  if (part.type === "tool-getTickets" && isDone && Array.isArray(part.output)) {
    return (
      <Task>
        <TaskTrigger title="Queries" />
        <TaskContent>
          {(part.output as any[]).map((t) => (
            <TaskItem key={t.id}>
              <span className="font-medium truncate">{t.subject}</span>{" "}
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {t.status}
              </Badge>
            </TaskItem>
          ))}
        </TaskContent>
      </Task>
    );
  }

  if (part.type === "tool-getTicketDetails") {
    return (
      <div className="bg-muted rounded-md p-2 text-xs flex items-center gap-2">
        {isDone ? (
          <>
            <CheckCircle2 className="size-3 text-green-500 shrink-0" />
            <span>Ticket loaded</span>
          </>
        ) : (
          <>
            <Loader2 className="size-3 animate-spin shrink-0" />
            <span>Loading ticket…</span>
          </>
        )}
      </div>
    );
  }

  if (part.type === "tool-draftTicketReply" || part.type === "tool-sendEmail") {
    const label =
      part.type === "tool-draftTicketReply"
        ? "Drafting email…"
        : "Sending email…";
    const doneLabel =
      part.type === "tool-draftTicketReply" ? "Draft saved" : "Email sent";
    return (
      <div className="bg-muted rounded-md p-2 text-xs flex items-center gap-2">
        {isDone ? (
          <>
            <CheckCircle2 className="size-3 text-green-500 shrink-0" />
            <span>{doneLabel}</span>
          </>
        ) : (
          <>
            <Loader2 className="size-3 animate-spin shrink-0" />
            <span>{label}</span>
          </>
        )}
      </div>
    );
  }

  // Generic fallback
  const toolName = part.type.replace("tool-", "");
  return (
    <div className="bg-muted rounded-md p-2 text-xs flex items-center gap-2">
      {isDone ? (
        <CheckCircle2 className="size-3 text-green-500 shrink-0" />
      ) : (
        <Loader2 className="size-3 animate-spin shrink-0" />
      )}
      <span className="text-muted-foreground">
        {toolName}
        {!isDone ? "…" : ""}
      </span>
    </div>
  );
}

// ── Message renderer ──────────────────────────────────────────────────────────

function Message({ message }: { message: DealScanUIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && (
        <div className="bg-primary text-primary-foreground rounded-full size-6 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="size-3" />
        </div>
      )}
      <div
        className={`max-w-[85%] flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <div
                key={i}
                className={`rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted rounded-tl-sm"
                }`}
              >
                {part.text}
              </div>
            );
          }
          if (part.type.startsWith("tool-") && "state" in part) {
            return (
              <div key={i} className="w-full">
                <ToolInvocationCard part={part as ToolPart} />
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

// ── Main chat panel ───────────────────────────────────────────────────────────

export function AgentChat() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const pageContext = useMemo(() => parsePageContext(pathname), [pathname]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent",
        body: pageContext ? { pageContext } : {},
      }),
    [pageContext],
  );

  const { messages, sendMessage, status, stop } = useChat<DealScanUIMessage>({
    transport,
  });

  return (
    <>
      {/* Floating toggle button — hidden when panel is open */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
          aria-label="Open AI assistant"
        >
          <Bot className="size-5" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-20 right-5 z-50 flex w-[380px] flex-col rounded-xl border bg-background shadow-2xl"
          style={{ height: 520 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Bot className="text-primary size-4 shrink-0" />
              <span className="text-sm font-semibold">DealScan AI</span>
              {pageContext && (
                <Badge
                  variant="secondary"
                  className="text-[9px] px-1.5 h-4 shrink-0"
                >
                  {PAGE_LABELS[pageContext.page] ?? pageContext.page}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Messages — Conversation handles sticky scroll */}
          <Conversation className="flex-1 min-h-0">
            <ConversationContent>
              {messages.length === 0 ? (
                <ConversationEmptyState
                  icon={<Bot className="size-8" />}
                  title="How can I help you today?"
                  description="Ask me about deals, red flags, or management queries."
                />
              ) : (
                messages.map((m) => <Message key={m.id} message={m} />)
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          {/* Prompt input */}
          <div className="border-t p-3 shrink-0">
            <PromptInput
              onSubmit={({ text }) => {
                if (text.trim()) sendMessage({ text });
              }}
            >
              <PromptInputTextarea
                placeholder="Ask about deals, red flags..."
                className="min-h-[52px] max-h-[120px]"
              />
              <PromptInputFooter>
                <span className="text-muted-foreground text-[10px]">
                  Enter to send · Shift+Enter for new line
                </span>
                <PromptInputSubmit status={status} onStop={stop} />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      )}
    </>
  );
}
