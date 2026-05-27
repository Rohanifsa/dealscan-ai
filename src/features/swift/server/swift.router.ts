import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";
import { log } from "@/lib/workflowLogger";
import { sendSwiftMT799Email } from "@/lib/mailer";

export const swiftRouter = createTRPCRouter({
  getByWorkflow: protectedProcedure
    .input(z.object({ workflowId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("swift_messages")
        .select(
          `
          *,
          discrepancy:discrepancies(field, ucp_article, severity)
          `,
        )
        .eq("workflow_id", input.workflowId)
        .order("created_at", { ascending: true });

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });

      return data ?? [];
    }),

  updateDraft: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        workflowId: z.string().uuid(),
        finalContent: z.string(),
        recipientEmail: z.string().email().optional(),
        recipientName: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("swift_messages")
        .update({
          final_content: input.finalContent,
          recipient_email: input.recipientEmail ?? null,
          recipient_name: input.recipientName ?? null,
        })
        .eq("id", input.id)
        .select()
        .single();

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });

      await log({
        workflowId: input.workflowId,
        actorType: "HUMAN",
        actorId: ctx.user.id,
        step: "SWIFT_EDITED",
        status: "COMPLETED",
        output: { swiftMessageId: input.id },
      });

      return data;
    }),

  approveAndSend: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        workflowId: z.string().uuid(),
        recipientEmail: z.string().email().optional(),
        recipientName: z.string().optional(),
        finalContent: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Persist any unsaved edits before sending
      if (input.recipientEmail || input.recipientName || input.finalContent) {
        await ctx.supabase
          .from("swift_messages")
          .update({
            ...(input.recipientEmail && {
              recipient_email: input.recipientEmail,
            }),
            ...(input.recipientName && { recipient_name: input.recipientName }),
            ...(input.finalContent && { final_content: input.finalContent }),
          })
          .eq("id", input.id);
      }

      // Fetch the message
      const { data: message, error: fetchError } = await ctx.supabase
        .from("swift_messages")
        .select("*")
        .eq("id", input.id)
        .single();

      if (fetchError || !message) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "SWIFT message not found",
        });
      }

      if (!message.recipient_email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Recipient email not found — please enter an email address and try again.",
        });
      }

      const content = message.final_content ?? message.draft_content;

      // Fetch workflow name
      const { data: workflow } = await ctx.supabase
        .from("workflows")
        .select("name")
        .eq("id", input.workflowId)
        .single();

      // Mark as approved
      await ctx.supabase
        .from("swift_messages")
        .update({ status: "APPROVED", approved_by: ctx.user.id })
        .eq("id", input.id);

      await log({
        workflowId: input.workflowId,
        actorType: "HUMAN",
        actorId: ctx.user.id,
        step: "SWIFT_APPROVED",
        status: "COMPLETED",
        output: { swiftMessageId: input.id },
      });

      try {
        await sendSwiftMT799Email({
          to: message.recipient_email,
          recipientName: message.recipient_name ?? message.recipient_email,
          messageContent: content,
          workflowName: workflow?.name ?? "Unknown Workflow",
          senderName: ctx.profile.full_name ?? ctx.user.email ?? "Analyst",
        });

        await ctx.supabase
          .from("swift_messages")
          .update({ status: "SENT", sent_at: new Date().toISOString() })
          .eq("id", input.id);

        await log({
          workflowId: input.workflowId,
          actorType: "HUMAN",
          actorId: ctx.user.id,
          step: "SWIFT_SENT",
          status: "COMPLETED",
          output: { swiftMessageId: input.id, to: message.recipient_email },
        });

        return { sent: true };
      } catch (emailError) {
        const errMsg =
          emailError instanceof Error ? emailError.message : "Send failed";

        await ctx.supabase
          .from("swift_messages")
          .update({ status: "FAILED" })
          .eq("id", input.id);

        await log({
          workflowId: input.workflowId,
          actorType: "SYSTEM",
          step: "SWIFT_SEND_FAILED",
          status: "FAILED",
          error: errMsg,
        });

        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: errMsg });
      }
    }),
});
