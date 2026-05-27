import { inngest } from "@/server/inngest/client";
import { serviceClient } from "@/lib/supabase/service";
import { flashLite } from "@/lib/gemini";
import { log } from "@/lib/workflowLogger";
import { generateText } from "ai";

export const generateSwift = inngest.createFunction(
  {
    id: "generate-swift",
    name: "Generate Management Queries",
    triggers: [{ event: "trade/compliance.complete" }],
  },
  async ({
    event,
    step,
  }: {
    event: { data: { workflowId: string } };
    step: any;
  }) => {
    const { workflowId } = event.data as { workflowId: string };

    // Step 1: Fetch all DISCREPANCY items to generate management query drafts for
    const rejections = await step.run("fetch-rejections", async () => {
      const { data, error } = await serviceClient
        .from("discrepancies")
        .select("*")
        .eq("workflow_id", workflowId)
        .eq("status", "DISCREPANCY");

      if (error) throw new Error(error.message);
      return data ?? [];
    });

    // Step 2: Generate a management query draft for each rejected diligence check
    await Promise.all(
      rejections.map(async (discrepancy: any) => {
        await step.run(`draft-swift-${discrepancy.id}`, async () => {
          const start = Date.now();
          try {
            const { text } = await generateText({
              model: flashLite,
              messages: [
                {
                  role: "user",
                  content: `You are a private equity associate writing a professional diligence question for the target company's management team.

Red flag details:
- Field: ${discrepancy.field}
- Diligence Check: ${discrepancy.ucp_article}
- CIM / Source Value: "${discrepancy.lc_value}"
- Document Shows: "${discrepancy.document_value}"
- Analysis: ${discrepancy.ai_reasoning ?? "Values do not match"}
- Severity: ${discrepancy.severity}

Write a clear, professional plain-English management query that:
1. Opens with: "Dear Management Team,"
2. States that this is a diligence clarification request
3. Clearly describes the red flag and the documents being compared
4. Explains why the issue matters for investment underwriting
5. Requests clarification, supporting schedule, or revised data
6. Closes professionally with "Best regards,"

Return ONLY the email body text.`,
                },
              ],
            });

            const { error: insertError } = await serviceClient
              .from("swift_messages")
              .insert({
                workflow_id: workflowId,
                discrepancy_id: discrepancy.id,
                message_type: "MT799",
                draft_content: text,
                status: "DRAFT",
              });

            if (insertError) throw new Error(insertError.message);

            await log({
              workflowId,
              actorType: "SYSTEM",
              step: "SWIFT_DRAFT_GENERATED",
              status: "COMPLETED",
              input: {
                discrepancyId: discrepancy.id,
                field: discrepancy.field,
              },
              output: { draftLength: text.length },
              durationMs: Date.now() - start,
            });
          } catch (err) {
            await log({
              workflowId,
              actorType: "SYSTEM",
              step: "SWIFT_DRAFT_GENERATED",
              status: "FAILED",
              error: err instanceof Error ? err.message : "Unknown",
              durationMs: Date.now() - start,
            });
          }
        });
      }),
    );

    // Step 3: Update workflow status
    // RESOLVED only when all discrepancies have been approved by human or auto-passed.
    await step.run("finalize-workflow", async () => {
      const { data: pending } = await serviceClient
        .from("discrepancies")
        .select("id")
        .eq("workflow_id", workflowId)
        .eq("status", "DISCREPANCY");

      const finalStatus =
        (pending?.length ?? 0) > 0 ? "HUMAN_REVIEW_REQUIRED" : "RESOLVED";

      await serviceClient
        .from("workflows")
        .update({ status: finalStatus, updated_at: new Date().toISOString() })
        .eq("id", workflowId);
    });
  },
);
