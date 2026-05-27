import { ToolLoopAgent, tool, InferAgentUIMessage } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

const model = google("gemini-2.0-flash");

// ── Tool schemas (shared between placeholder and real agent) ─────────────────

const workflowIdInput = z.object({
  workflowId: z.string().uuid().describe("UUID of the workflow"),
});

const ticketIdInput = z.object({
  ticketId: z.string().uuid().describe("UUID of the ticket"),
});

const documentIdInput = z.object({
  documentId: z.string().uuid().describe("UUID of the document"),
});

// ── Page context injected by the client ──────────────────────────────────────

export interface PageContext {
  /** Slug identifying the current page type */
  page:
    | "workflow-overview"
    | "workflow-documents"
    | "workflow-discrepancies"
    | "workflow-tickets"
    | "ticket-detail"
    | string;
  workflowId?: string;
  ticketId?: string;
}

// ── Placeholder agent for type inference ─────────────────────────────────────
// The execute stubs here are never called — the real agent is created per-request.

const _placeholderAgent = new ToolLoopAgent({
  model,
  instructions: "",
  tools: {
    getWorkflows: tool({
      description: "List all private equity diligence workflows belonging to the user.",
      inputSchema: z.object({}),
      execute: async () =>
        [] as {
          id: string;
          name: string;
          status: string;
          created_at: string;
        }[],
    }),

    getWorkflowDetails: tool({
      description:
        "Get details about a specific workflow including document counts and red flag counts.",
      inputSchema: workflowIdInput,
      execute: async () =>
        null as null | {
          id: string;
          name: string;
          status: string;
          description: string | null;
          created_at: string;
        },
    }),

    getDiscrepancies: tool({
      description:
        "List all diligence red flags found in a workflow. Shows field mismatches between documents.",
      inputSchema: workflowIdInput,
      execute: async () =>
        [] as {
          id: string;
          field: string;
          status: string;
          severity: string;
          lc_value: string | null;
          document_value: string | null;
          ucp_article: string | null;
        }[],
    }),

    getTickets: tool({
      description:
        "List all tickets (email escalations) created for a workflow.",
      inputSchema: workflowIdInput,
      execute: async () =>
        [] as {
          id: string;
          subject: string;
          status: string;
          created_at: string;
          messageCount: number;
        }[],
    }),

    getTicketDetails: tool({
      description:
        "Get full details of a specific ticket including its message thread.",
      inputSchema: ticketIdInput,
      execute: async () =>
        null as null | {
          id: string;
          subject: string;
          status: string;
          messages: {
            id: string;
            direction: string;
            body: string;
            from_email: string;
            sent_at: string | null;
          }[];
        },
    }),

    getDocuments: tool({
      description:
        "List all documents uploaded to a workflow along with their types and all extracted investment diligence fields.",
      inputSchema: workflowIdInput,
      execute: async () =>
        [] as {
          id: string;
          type: string;
          file_name: string;
          uploaded_at: string;
          extracted_json: Record<string, unknown> | null;
        }[],
    }),

    getDocumentDetails: tool({
      description:
        "Get the full extracted data fields for a specific document by ID. Returns every parsed field.",
      inputSchema: documentIdInput,
      execute: async () =>
        null as null | {
          id: string;
          type: string;
          file_name: string;
          uploaded_at: string;
          workflow_id: string;
          extracted_json: Record<string, unknown> | null;
        },
    }),

    draftTicketReply: tool({
      description:
        "Draft a reply email for a ticket. Saves the draft to the ticket so the user can review and send it.",
      inputSchema: z.object({
        ticketId: z.string().uuid().describe("UUID of the ticket to reply to"),
        body: z.string().describe("Full body of the email reply to draft"),
        toEmails: z
          .string()
          .describe("Comma-separated recipient email addresses"),
      }),
      execute: async () => ({ success: true, messageId: "" }),
    }),

    sendEmail: tool({
      description:
        "Send an email directly for a ticket. Use this only when the user explicitly asks to send — otherwise use draftTicketReply.",
      inputSchema: z.object({
        ticketId: z.string().uuid().describe("UUID of the ticket"),
        body: z.string().describe("Email body"),
        toEmails: z
          .string()
          .describe("Comma-separated recipient email addresses"),
        subject: z.string().optional().describe("Optional subject override"),
      }),
      execute: async () => ({ success: true }),
    }),
  },
});

export type DealScanUIMessage = InferAgentUIMessage<typeof _placeholderAgent>;

// ── Real agent factory (created per-request with a live Supabase client) ─────

export function createDealScanAgent(
  supabase: SupabaseClient,
  userId: string,
  pageContext?: PageContext,
) {
  return new ToolLoopAgent({
    model,
    instructions: `You are DealScan AI, an intelligent assistant embedded in a private equity diligence document compliance platform.

You help users manage private equity diligence workflows, review document red flags, and handle management query communications.

Key capabilities:
- Retrieve and summarise workflows along with their diligence status
- Explain red flags found between deal documents (e.g. CIM vs management accounts)
- List and read management query threads, including all extracted document fields
- Draft professional management query replies
- Send emails on behalf of the user when explicitly asked

Guidelines:
- Always fetch relevant data before answering questions — don't guess values
- When drafting emails, be professional and concise
- When asked to send an email, confirm the recipients and body with the user first unless they explicitly say "send it"
- Refer to red flag fields and diligence checks clearly
- If a workflow UUID is needed but not provided, call getWorkflows first to show options${
      pageContext
        ? `

## Current page context
The user is currently viewing: **${pageContext.page}**${
            pageContext.workflowId
              ? `
Current workflow ID: ${pageContext.workflowId}`
              : ""
          }${
            pageContext.ticketId
              ? `
Current ticket ID: ${pageContext.ticketId}`
              : ""
          }
Use these IDs directly when answering questions — do not ask the user to provide them. Proactively fetch the relevant data for the current page when it would help answer the question.`
        : ""
    }`,

    tools: {
      getWorkflows: tool({
        description: "List all private equity diligence workflows belonging to the user.",
        inputSchema: z.object({}),
        execute: async () => {
          const { data } = await supabase
            .from("workflows")
            .select("id, name, status, created_at")
            .eq("created_by", userId)
            .order("created_at", { ascending: false });
          return data ?? [];
        },
      }),

      getWorkflowDetails: tool({
        description:
          "Get details about a specific workflow including document and red flag counts.",
        inputSchema: workflowIdInput,
        execute: async ({ workflowId }) => {
          const { data } = await supabase
            .from("workflows")
            .select(
              `id, name, status, description, created_at,
               documents:documents(count),
               discrepancies:discrepancies(count)`,
            )
            .eq("id", workflowId)
            .eq("created_by", userId)
            .single();
          return data ?? null;
        },
      }),

      getDiscrepancies: tool({
        description: "List all diligence red flags found in a workflow.",
        inputSchema: workflowIdInput,
        execute: async ({ workflowId }) => {
          const { data } = await supabase
            .from("discrepancies")
            .select(
              "id, field, status, severity, lc_value, document_value, ucp_article, ai_reasoning",
            )
            .eq("workflow_id", workflowId)
            .order("created_at", { ascending: true });
          return data ?? [];
        },
      }),

      getTickets: tool({
        description:
          "List all management query tickets created for a workflow.",
        inputSchema: workflowIdInput,
        execute: async ({ workflowId }) => {
          const { data } = await supabase
            .from("tickets")
            .select(
              `id, subject, status, created_at,
               messages:ticket_messages(id)`,
            )
            .eq("workflow_id", workflowId)
            .order("created_at", { ascending: true });

          return (data ?? []).map((t: any) => ({
            id: t.id,
            subject: t.subject,
            status: t.status,
            created_at: t.created_at,
            messageCount: t.messages?.length ?? 0,
          }));
        },
      }),

      getTicketDetails: tool({
        description:
          "Get full details of a specific ticket including its message thread.",
        inputSchema: ticketIdInput,
        execute: async ({ ticketId }) => {
          const { data } = await supabase
            .from("tickets")
            .select(
              `id, subject, status,
               messages:ticket_messages(id, direction, body, from_email, sent_at, is_draft)`,
            )
            .eq("id", ticketId)
            .single();
          if (!data) return null;
          // Only include sent messages in the thread summary (no drafts)
          return {
            ...data,
            messages: (data.messages ?? []).filter((m: any) => !m.is_draft),
          };
        },
      }),

      draftTicketReply: tool({
        description:
          "Save a draft reply email for a ticket. The user can review and send it from the ticket page.",
        inputSchema: z.object({
          ticketId: z.string().uuid(),
          body: z.string(),
          toEmails: z.string(),
        }),
        execute: async ({ ticketId, body, toEmails }) => {
          // Fetch ticket subject
          const { data: ticket } = await supabase
            .from("tickets")
            .select("subject")
            .eq("id", ticketId)
            .single();

          const { data, error } = await supabase
            .from("ticket_messages")
            .insert({
              ticket_id: ticketId,
              direction: "OUTBOUND",
              from_email: "agent@dealscan.ai",
              from_name: "DealScan AI",
              to_emails: toEmails,
              subject: ticket?.subject ?? "Re: Ticket",
              body,
              is_draft: true,
            })
            .select("id")
            .single();

          if (error) return { success: false, messageId: null };
          return { success: true, messageId: data.id };
        },
      }),

      getDocuments: tool({
        description:
          "List all documents uploaded to a workflow along with their types and all extracted investment diligence fields.",
        inputSchema: workflowIdInput,
        execute: async ({ workflowId }) => {
          const { data } = await supabase
            .from("documents")
            .select("id, type, file_name, uploaded_at, extracted_json")
            .eq("workflow_id", workflowId)
            .order("uploaded_at", { ascending: true });
          return data ?? [];
        },
      }),

      getDocumentDetails: tool({
        description:
          "Get the full extracted data fields for a specific document by ID. Returns every parsed field including target company, revenue, EBITDA, debt, ownership, etc.",
        inputSchema: documentIdInput,
        execute: async ({ documentId }) => {
          const { data } = await supabase
            .from("documents")
            .select(
              "id, type, file_name, uploaded_at, workflow_id, extracted_json",
            )
            .eq("id", documentId)
            .single();
          return data ?? null;
        },
      }),

      sendEmail: tool({
        description:
          "Send an email directly for a ticket. Only call this when the user explicitly asks to send the email.",
        inputSchema: z.object({
          ticketId: z.string().uuid(),
          body: z.string(),
          toEmails: z.string(),
          subject: z.string().optional(),
        }),
        execute: async ({ ticketId, body, toEmails, subject }) => {
          const { sendTicketEmail } = await import("@/lib/mailer");

          const { data: ticket } = await supabase
            .from("tickets")
            .select("subject, workflow:workflows(name)")
            .eq("id", ticketId)
            .single();

          await sendTicketEmail({
            to: toEmails,
            subject: subject ?? ticket?.subject ?? "Ticket Update",
            body,
            workflowName: (ticket?.workflow as any)?.name ?? "",
            senderName: "DealScan AI",
          });

          const now = new Date().toISOString();
          await supabase.from("ticket_messages").insert({
            ticket_id: ticketId,
            direction: "OUTBOUND",
            from_email: process.env.SMTP_USER ?? "noreply@dealscan.ai",
            from_name: "DealScan AI",
            to_emails: toEmails,
            subject: subject ?? ticket?.subject ?? "Ticket Update",
            body,
            is_draft: false,
            sent_at: now,
          });

          await supabase
            .from("tickets")
            .update({ status: "IN_PROGRESS", updated_at: now })
            .eq("id", ticketId);

          return { success: true };
        },
      }),
    },
  });
}
