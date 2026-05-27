import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";
import { log } from "@/lib/workflowLogger";

export const workflowRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("workflows")
        .insert({
          name: input.name,
          description: input.description ?? null,
          created_by: ctx.user.id,
        })
        .select()
        .single();

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });

      await log({
        workflowId: data.id,
        actorType: "HUMAN",
        actorId: ctx.user.id,
        step: "WORKFLOW_CREATED",
        status: "COMPLETED",
        output: { workflowId: data.id, name: data.name },
      });

      return data;
    }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("workflows")
      .select(
        `
        *,
        documents:documents(count),
        discrepancies:discrepancies(count)
        `,
      )
      .eq("created_by", ctx.user.id)
      .order("created_at", { ascending: false });

    if (error)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message,
      });

    return data ?? [];
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("workflows")
        .select(
          `
          *,
          documents:documents(count),
          discrepancies:discrepancies(count),
          swift_messages:swift_messages(count)
          `,
        )
        .eq("id", input.id)
        .eq("created_by", ctx.user.id)
        .single();

      if (error)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow not found",
        });

      // Separately count discrepancies needing human review
      const { count: humanReviewCount } = await ctx.supabase
        .from("discrepancies")
        .select("*", { count: "exact", head: true })
        .eq("workflow_id", input.id)
        .eq("status", "DISCREPANCY");

      return { ...data, human_review_count: humanReviewCount ?? 0 };
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum([
          "PENDING",
          "EXTRACTING",
          "VALIDATING",
          "HUMAN_REVIEW_REQUIRED",
          "RESOLVED",
          "FAILED",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("workflows")
        .update({ status: input.status, updated_at: new Date().toISOString() })
        .eq("id", input.id)
        .eq("created_by", ctx.user.id)
        .select()
        .single();

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });

      return data;
    }),
});
