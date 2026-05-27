import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";
import { log } from "@/lib/workflowLogger";
import { inngest } from "@/server/inngest/client";

export const documentsRouter = createTRPCRouter({
  upload: protectedProcedure
    .input(
      z.object({
        workflowId: z.string().uuid(),
        type: z.enum(["LC", "INVOICE", "BILL_OF_LADING"]),
        fileName: z.string(),
        fileBase64: z.string(), // base64 encoded file content
        mimeType: z.string().default("application/pdf"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify workflow ownership
      const { data: workflow, error: wfError } = await ctx.supabase
        .from("workflows")
        .select("id")
        .eq("id", input.workflowId)
        .eq("created_by", ctx.user.id)
        .single();

      if (wfError || !workflow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow not found",
        });
      }

      // Upload to Supabase Storage
      const fileBuffer = Buffer.from(input.fileBase64, "base64");
      const storagePath = `${ctx.user.id}/${input.workflowId}/${input.type}_${Date.now()}_${input.fileName}`;

      const { error: storageError } = await ctx.supabase.storage
        .from("trade-documents")
        .upload(storagePath, fileBuffer, {
          contentType: input.mimeType,
          upsert: false,
        });

      if (storageError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: storageError.message,
        });
      }

      const { data: urlData } = ctx.supabase.storage
        .from("trade-documents")
        .getPublicUrl(storagePath);

      // Insert document record
      const { data, error } = await ctx.supabase
        .from("documents")
        .insert({
          workflow_id: input.workflowId,
          uploaded_by: ctx.user.id,
          type: input.type,
          file_name: input.fileName,
          file_url: urlData.publicUrl,
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      await log({
        workflowId: input.workflowId,
        actorType: "HUMAN",
        actorId: ctx.user.id,
        step: "DOCUMENT_UPLOADED",
        status: "COMPLETED",
        output: {
          documentId: data.id,
          type: input.type,
          fileName: input.fileName,
        },
      });

      return data;
    }),

  getByWorkflow: protectedProcedure
    .input(z.object({ workflowId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("documents")
        .select("*")
        .eq("workflow_id", input.workflowId)
        .order("uploaded_at", { ascending: true });

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });

      return data ?? [];
    }),

  triggerProcessing: protectedProcedure
    .input(z.object({ workflowId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const { data: workflow, error: wfError } = await ctx.supabase
        .from("workflows")
        .select("id, status")
        .eq("id", input.workflowId)
        .eq("created_by", ctx.user.id)
        .single();

      if (wfError || !workflow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow not found",
        });
      }

      await log({
        workflowId: input.workflowId,
        actorType: "HUMAN",
        actorId: ctx.user.id,
        step: "WORKFLOW_TRIGGERED",
        status: "COMPLETED",
      });

      await inngest.send({
        name: "trade/workflow.triggered",
        data: { workflowId: input.workflowId },
      });

      return { triggered: true };
    }),
});
