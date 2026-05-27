import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";
import { serviceClient } from "@/lib/supabase/service";
import { sendTicketEmail } from "@/lib/mailer";
import { log } from "@/lib/workflowLogger";

export const ticketsRouter = createTRPCRouter({
  // ── List tickets for a workflow ───────────────────────────────────────────
  getByWorkflow: protectedProcedure
    .input(z.object({ workflowId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("tickets")
        .select(
          `
          *,
          discrepancy:discrepancies(field, ucp_article, severity, lc_value, document_value),
          members:ticket_members(
            id, role,
            profile:profiles(id, full_name, email, avatar_url)
          ),
          messages:ticket_messages(id)
          `,
        )
        .eq("workflow_id", input.workflowId)
        .order("created_at", { ascending: true });

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });

      return (data ?? []).map((t) => ({
        ...t,
        messageCount: t.messages?.length ?? 0,
        messages: undefined,
      }));
    }),

  // ── Single ticket with full thread ────────────────────────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("tickets")
        .select(
          `
          *,
          discrepancy:discrepancies(field, ucp_article, severity, lc_value, document_value, ai_reasoning),
          members:ticket_members(
            id, role,
            profile:profiles(id, full_name, email, avatar_url)
          ),
          messages:ticket_messages(*)
          `,
        )
        .eq("id", input.id)
        .order("created_at", {
          ascending: true,
          referencedTable: "ticket_messages",
        })
        .single();

      if (error || !data)
        throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });

      return data;
    }),

  // ── Update draft message body / recipients ────────────────────────────────
  updateDraft: protectedProcedure
    .input(
      z.object({
        messageId: z.string().uuid(),
        body: z.string(),
        toEmails: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("ticket_messages")
        .update({ body: input.body, to_emails: input.toEmails })
        .eq("id", input.messageId);

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
    }),

  // ── Send a message (outbound or new reply) ────────────────────────────────
  sendMessage: protectedProcedure
    .input(
      z.object({
        ticketId: z.string().uuid(),
        messageId: z.string().uuid().optional(), // if sending an existing draft
        body: z.string().min(1),
        toEmails: z.string().min(1),
        subject: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch ticket + workflow for context
      const { data: ticket, error: tickErr } = await ctx.supabase
        .from("tickets")
        .select(
          "*, discrepancy:discrepancies(field), workflow:workflows(id, name)",
        )
        .eq("id", input.ticketId)
        .single();

      if (tickErr || !ticket)
        throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });

      const senderName =
        ctx.profile?.full_name ?? ctx.user?.email ?? "DealScan AI";
      const fromEmail = process.env.SMTP_USER ?? "noreply@dealscan.ai";
      const subject = input.subject ?? ticket.subject;

      // Send via SMTP
      await sendTicketEmail({
        to: input.toEmails,
        subject,
        body: input.body,
        workflowName: (ticket.workflow as any)?.name ?? "",
        senderName,
      });

      const now = new Date().toISOString();

      if (input.messageId) {
        // Update existing draft → mark sent
        await ctx.supabase
          .from("ticket_messages")
          .update({
            body: input.body,
            to_emails: input.toEmails,
            is_draft: false,
            sent_at: now,
            from_email: fromEmail,
            from_name: senderName,
          })
          .eq("id", input.messageId);
      } else {
        // Insert a new outbound message
        await ctx.supabase.from("ticket_messages").insert({
          ticket_id: input.ticketId,
          direction: "OUTBOUND",
          from_email: fromEmail,
          from_name: senderName,
          to_emails: input.toEmails,
          subject,
          body: input.body,
          is_draft: false,
          sent_at: now,
        });
      }

      // Update ticket status
      await ctx.supabase
        .from("tickets")
        .update({ status: "IN_PROGRESS", updated_at: now })
        .eq("id", input.ticketId);

      await log({
        workflowId: (ticket.workflow as any)?.id,
        actorType: "HUMAN",
        actorId: ctx.user!.id,
        step: "TICKET_EMAIL_SENT",
        status: "COMPLETED",
        output: { ticketId: input.ticketId },
      });
    }),

  // ── Update ticket status ──────────────────────────────────────────────────
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum([
          "OPEN",
          "IN_PROGRESS",
          "AWAITING_REPLY",
          "RESOLVED",
          "CLOSED",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("tickets")
        .update({ status: input.status, updated_at: new Date().toISOString() })
        .eq("id", input.id);

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
    }),

  // ── Update ticket priority ────────────────────────────────────────────────
  updatePriority: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("tickets")
        .update({
          priority: input.priority,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.id);

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
    }),

  // ── Add member to ticket ──────────────────────────────────────────────────
  addMember: protectedProcedure
    .input(
      z.object({
        ticketId: z.string().uuid(),
        userId: z.string().uuid(),
        role: z.enum(["ASSIGNEE", "WATCHER"]).default("WATCHER"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("ticket_members")
        .upsert(
          {
            ticket_id: input.ticketId,
            user_id: input.userId,
            role: input.role,
          },
          { onConflict: "ticket_id,user_id" },
        );

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
    }),

  // ── Remove member from ticket ─────────────────────────────────────────────
  removeMember: protectedProcedure
    .input(z.object({ memberId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("ticket_members")
        .delete()
        .eq("id", input.memberId);

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
    }),

  // ── List all workspace users (for member picker) ──────────────────────────
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await serviceClient
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .order("full_name");

    if (error)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message,
      });

    return data ?? [];
  }),
});
