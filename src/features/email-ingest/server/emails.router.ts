import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";
import { log } from "@/lib/workflowLogger";
import {
  getAccessToken,
  downloadAttachment,
  fetchThreadMessages,
  extractAttachments,
  getHeader,
} from "@/lib/gmail";
import { inngest } from "@/server/inngest/client";

export const emailsRouter = createTRPCRouter({
  // List all email events for the current user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("email_events")
      .select("*, workflows(id, name, status)")
      .eq("created_by", ctx.user.id)
      .order("received_at", { ascending: false });

    if (error)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message,
      });

    return data ?? [];
  }),

  // Mark an email as ignored
  ignore: protectedProcedure
    .input(z.object({ messageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("email_events")
        .update({ status: "IGNORED" })
        .eq("message_id", input.messageId)
        .eq("created_by", ctx.user.id);

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });

      return { success: true };
    }),

  // Create a trade (workflow) from an email event
  createTradeFromEmail: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        tradeName: z.string().min(1),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the email event belongs to this user
      const { data: emailEvent, error: fetchError } = await ctx.supabase
        .from("email_events")
        .select("*")
        .eq("message_id", input.messageId)
        .eq("created_by", ctx.user.id)
        .single();

      if (fetchError || !emailEvent)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email event not found",
        });

      if (emailEvent.status === "TRADE_CREATED")
        throw new TRPCError({
          code: "CONFLICT",
          message: "Trade already created for this email",
        });

      // Create the workflow
      const { data: workflow, error: workflowError } = await ctx.supabase
        .from("workflows")
        .insert({
          name: input.tradeName,
          description: input.description ?? null,
          created_by: ctx.user.id,
        })
        .select()
        .single();

      if (workflowError || !workflow)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: workflowError?.message,
        });

      await log({
        workflowId: workflow.id,
        actorType: "HUMAN",
        actorId: ctx.user.id,
        step: "WORKFLOW_CREATED",
        status: "COMPLETED",
        output: {
          workflowId: workflow.id,
          name: workflow.name,
          source: "email",
        },
      });

      // Link the email event to the workflow and mark it as TRADE_CREATED
      const { error: updateError } = await ctx.supabase
        .from("email_events")
        .update({ status: "TRADE_CREATED", workflow_id: workflow.id })
        .eq("message_id", input.messageId)
        .eq("created_by", ctx.user.id);

      if (updateError)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: updateError.message,
        });

      // Download Gmail attachments and register them as documents
      type StoredAttachmentMeta = {
        filename: string;
        inferred_doc_type: string;
        size?: number;
        attachmentId?: string;
      };
      const attachments = (emailEvent.attachment_meta ??
        []) as StoredAttachmentMeta[];
      const downloadable = attachments.filter(
        (a) => a.inferred_doc_type !== "UNKNOWN" && a.attachmentId,
      );
      if (downloadable.length > 0) {
        try {
          const accessToken = await getAccessToken();
          await Promise.allSettled(
            downloadable.map(async (att, idx) => {
              const fileBuffer = await downloadAttachment(
                emailEvent.message_id,
                att.attachmentId!,
                accessToken,
              );
              const storagePath = `${ctx.user.id}/${workflow.id}/${att.inferred_doc_type}_${Date.now()}_${idx}_${att.filename}`;
              const { error: storageError } = await ctx.supabase.storage
                .from("trade-documents")
                .upload(storagePath, fileBuffer, {
                  contentType: "application/pdf",
                  upsert: false,
                });
              if (storageError) throw new Error(storageError.message);
              const { data: urlData } = ctx.supabase.storage
                .from("trade-documents")
                .getPublicUrl(storagePath);
              await ctx.supabase.from("documents").insert({
                workflow_id: workflow.id,
                uploaded_by: ctx.user.id,
                type: att.inferred_doc_type as
                  | "LC"
                  | "INVOICE"
                  | "BILL_OF_LADING",
                file_name: att.filename,
                file_url: urlData.publicUrl,
              });
            }),
          );
        } catch {
          // Non-fatal — trade is created even if attachment download fails
        }
      }

      return workflow;
    }),

  // Seed a mock email event (dev/demo only — used for UI testing before Gmail is wired)
  seedMock: protectedProcedure
    .input(
      z.object({
        fromAddress: z.string().email(),
        subject: z.string(),
        snippet: z.string().optional(),
        attachmentMeta: z
          .array(
            z.object({
              filename: z.string(),
              inferred_doc_type: z.enum([
                "LC",
                "INVOICE",
                "BILL_OF_LADING",
                "UNKNOWN",
              ]),
              size: z.number().optional(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("email_events")
        .insert({
          thread_id: crypto.randomUUID(),
          message_id: crypto.randomUUID(),
          from_address: input.fromAddress,
          subject: input.subject,
          snippet: input.snippet ?? null,
          received_at: new Date().toISOString(),
          status: "NEW",
          attachment_meta: input.attachmentMeta ?? [],
          created_by: ctx.user.id,
        })
        .select()
        .single();

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });

      return data;
    }),

  // ── Get all emails in the thread linked to a workflow ─────────────────────
  getThreadEmails: protectedProcedure
    .input(z.object({ workflowId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Find the thread_id for this workflow
      const { data: anchor, error: anchorError } = await ctx.supabase
        .from("email_events")
        .select("thread_id")
        .eq("workflow_id", input.workflowId)
        .eq("created_by", ctx.user.id)
        .limit(1)
        .single();

      if (anchorError || !anchor) return { threadId: null, emails: [] };

      // Fetch all email_events in that thread (regardless of workflow_id)
      const { data: emails, error: emailsError } = await ctx.supabase
        .from("email_events")
        .select("*")
        .eq("thread_id", anchor.thread_id)
        .order("received_at", { ascending: true });

      if (emailsError)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: emailsError.message,
        });

      return { threadId: anchor.thread_id, emails: emails ?? [] };
    }),

  // ── Sync thread: pull new messages and their attachments ──────────────────
  syncThread: protectedProcedure
    .input(z.object({ workflowId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // 1. Verify ownership + get thread_id
      const { data: workflow, error: wfError } = await ctx.supabase
        .from("workflows")
        .select("id, status")
        .eq("id", input.workflowId)
        .eq("created_by", ctx.user.id)
        .single();

      if (wfError || !workflow)
        throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });

      const { data: anchor } = await ctx.supabase
        .from("email_events")
        .select("thread_id")
        .eq("workflow_id", input.workflowId)
        .eq("created_by", ctx.user.id)
        .limit(1)
        .single();

      if (!anchor?.thread_id)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No email thread linked to this workflow",
        });

      const { thread_id: threadId } = anchor;

      // 2. Get already-known message IDs for this thread
      const { data: existingEvents } = await ctx.supabase
        .from("email_events")
        .select("message_id")
        .eq("thread_id", threadId);

      const knownMessageIds = new Set(
        (existingEvents ?? []).map((e) => e.message_id),
      );

      // 3. Fetch complete thread from Gmail
      const accessToken = await getAccessToken();
      const threadMessages = await fetchThreadMessages(threadId, accessToken);

      const newMessages = threadMessages.filter(
        (m) => !knownMessageIds.has(m.id),
      );

      if (newMessages.length === 0)
        return { newMessages: 0, newDocuments: 0, replacedDocuments: 0 };

      // 4. Get existing documents for this workflow (for replacement logic)
      const { data: existingDocs } = await ctx.supabase
        .from("documents")
        .select("id, type, file_url")
        .eq("workflow_id", input.workflowId);

      const existingDocsByType = new Map(
        (existingDocs ?? []).map((d) => [d.type, d]),
      );

      type StorageResult = {
        newDocuments: number;
        replacedDocuments: number;
      };

      let newDocuments = 0;
      let replacedDocuments = 0;

      // 5. Process each new message
      for (const msg of newMessages) {
        const fromAddress = getHeader(msg, "From");
        const subject = getHeader(msg, "Subject");
        const internalDate = msg.internalDate
          ? new Date(Number(msg.internalDate)).toISOString()
          : new Date().toISOString();

        const attachments = extractAttachments(msg);

        // Upsert the email_event for this new message
        await ctx.supabase.from("email_events").upsert(
          {
            thread_id: threadId,
            message_id: msg.id,
            workflow_id: input.workflowId,
            from_address: fromAddress,
            subject,
            snippet: msg.snippet ?? null,
            received_at: internalDate,
            status: "TRADE_CREATED",
            attachment_meta: attachments,
            created_by: ctx.user.id,
          },
          { onConflict: "message_id" },
        );

        // Download and store attachments
        const knowableAttachments = attachments.filter(
          (a) => a.inferred_doc_type !== "UNKNOWN" && a.attachmentId,
        );

        await Promise.allSettled(
          knowableAttachments.map(async (att) => {
            const fileBuffer = await downloadAttachment(
              msg.id,
              att.attachmentId!,
              accessToken,
            );

            const docType = att.inferred_doc_type as
              | "LC"
              | "INVOICE"
              | "BILL_OF_LADING";
            const storagePath = `${ctx.user.id}/${input.workflowId}/${docType}_${Date.now()}_${att.filename}`;

            const { error: storageError } = await ctx.supabase.storage
              .from("trade-documents")
              .upload(storagePath, fileBuffer, {
                contentType: "application/pdf",
                upsert: true,
              });

            if (storageError) throw new Error(storageError.message);

            const { data: urlData } = ctx.supabase.storage
              .from("trade-documents")
              .getPublicUrl(storagePath);

            const existing = existingDocsByType.get(docType);

            if (existing) {
              // Replace: update the existing document record
              await ctx.supabase
                .from("documents")
                .update({
                  file_name: att.filename,
                  file_url: urlData.publicUrl,
                  raw_text: null,
                  extracted_json: null,
                  ocr_repaired: false,
                })
                .eq("id", existing.id);
              replacedDocuments++;
            } else {
              // New document type
              await ctx.supabase.from("documents").insert({
                workflow_id: input.workflowId,
                uploaded_by: ctx.user.id,
                type: docType,
                file_name: att.filename,
                file_url: urlData.publicUrl,
              });
              existingDocsByType.set(docType, {
                id: crypto.randomUUID(),
                type: docType,
                file_url: urlData.publicUrl,
              });
              newDocuments++;
            }
          }),
        );
      }

      await log({
        workflowId: input.workflowId,
        actorType: "SYSTEM",
        actorId: ctx.user.id,
        step: "THREAD_SYNCED",
        status: "COMPLETED",
        output: {
          newMessages: newMessages.length,
          newDocuments,
          replacedDocuments,
        },
      });

      // 6. If new/replaced docs found, reset workflow to PENDING so re-processing can be triggered
      if (newDocuments > 0 || replacedDocuments > 0) {
        await ctx.supabase
          .from("workflows")
          .update({ status: "PENDING" })
          .eq("id", input.workflowId);
      }

      return {
        newMessages: newMessages.length,
        newDocuments,
        replacedDocuments,
      };
    }),
});

