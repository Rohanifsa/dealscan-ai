import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";
import { log } from "@/lib/workflowLogger";
import { inngest } from "@/server/inngest/client";

export const discrepanciesRouter = createTRPCRouter({
  getByWorkflow: protectedProcedure
    .input(z.object({ workflowId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("discrepancies")
        .select(
          `
          *,
          source_doc:documents!source_doc_id(id, file_name, type),
          compare_doc:documents!compare_doc_id(id, file_name, type)
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

  approveReview: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        workflowId: z.string().uuid(),
        analystNote: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("discrepancies")
        .update({
          status: "APPROVED",
          resolved_by: ctx.user.id,
          resolved_at: new Date().toISOString(),
          analyst_note: input.analystNote ?? null,
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
        step: "HUMAN_REVIEW_APPROVED",
        status: "COMPLETED",
        output: { discrepancyId: input.id },
      });

      // Trigger workflow status update (no ticket created for approvals)
      await inngest.send({
        name: "trade/compliance.complete",
        data: { workflowId: input.workflowId },
      });

      return data;
    }),

  rejectReview: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        workflowId: z.string().uuid(),
        analystNote: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("discrepancies")
        .update({
          status: "DISCREPANCY",
          resolved_by: ctx.user.id,
          resolved_at: new Date().toISOString(),
          analyst_note: input.analystNote ?? null,
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
        step: "HUMAN_REVIEW_REJECTED",
        status: "COMPLETED",
        output: { discrepancyId: input.id },
      });

      // Trigger ticket generation for this specific rejected discrepancy
      await inngest.send({
        name: "trade/compliance.complete",
        data: { workflowId: input.workflowId, discrepancyId: input.id },
      });

      return data;
    }),
});
