import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";

export const auditRouter = createTRPCRouter({
  getByWorkflow: protectedProcedure
    .input(z.object({ workflowId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("workflow_logs")
        .select(
          `
          *,
          actor:profiles(full_name, email)
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
});
