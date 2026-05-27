import { inngest } from "@/server/inngest/client";
import { serviceClient } from "@/lib/supabase/service";
import { flashLite } from "@/lib/gemini";
import { log } from "@/lib/workflowLogger";
import { generateText } from "ai";

export const generateTickets = inngest.createFunction(
  {
    id: "generate-tickets",
    name: "Generate Management Queries",
    triggers: [{ event: "trade/compliance.complete" }],
  },
  async ({
    event,
    step,
  }: {
    event: { data: { workflowId: string; discrepancyId?: string } };
    step: any;
  }) => {
    const { workflowId, discrepancyId } = event.data as {
      workflowId: string;
      discrepancyId?: string;
    };

    // Step 1: Fetch workflow for context
    const workflow = await step.run("fetch-workflow", async () => {
      const { data, error } = await serviceClient
        .from("workflows")
        .select("name")
        .eq("id", workflowId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    });

    // Step 2: Only create a query when triggered from a manual red flag escalation
    if (discrepancyId) {
      const discrepancy = await step.run("fetch-discrepancy", async () => {
        const { data, error } = await serviceClient
          .from("discrepancies")
          .select("*")
          .eq("id", discrepancyId)
          .eq("workflow_id", workflowId)
          .single();
        if (error) throw new Error(error.message);
        return data;
      });

      await step.run(`generate-ticket-${discrepancyId}`, async () => {
        const start = Date.now();

        // Guard against duplicate tickets
        const { data: existing } = await serviceClient
          .from("tickets")
          .select("id")
          .eq("discrepancy_id", discrepancyId)
          .maybeSingle();

        if (existing) return; // ticket already exists, skip

        const subject = `Diligence query: ${discrepancy.field} — ${workflow.name}`;

        // AI-generate a professional query body, fall back to a template if AI fails
        let body: string;
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
2. States this is a diligence clarification request for workflow "${workflow.name}"
3. Clearly describes the red flag and the documents being compared
4. Explains why the issue matters for investment underwriting
5. Requests clarification, supporting schedule, or revised data
6. Closes professionally with "Best regards,"

Return ONLY the email body text.`,
              },
            ],
          });
          body = text;
        } catch {
          // Fall back to a plain template so the ticket is always created
          body = `Dear Management Team,\n\nWe are requesting clarification on a diligence red flag identified in the workflow "${workflow.name}".\n\nField: ${discrepancy.field}\nDiligence Check: ${discrepancy.ucp_article}\nCIM / Source Value: "${discrepancy.lc_value ?? "N/A"}"\nDocument Shows: "${discrepancy.document_value ?? "N/A"}"\n\nPlease provide clarification, a supporting schedule, or revised data at your earliest convenience.\n\nBest regards,\nDealScan AI`;
        }

        // Create the ticket — throw on DB error so Inngest retries
        const { data: ticket, error: ticketError } = await serviceClient
          .from("tickets")
          .insert({
            workflow_id: workflowId,
            discrepancy_id: discrepancy.id,
            subject,
            status: "OPEN",
            priority:
              discrepancy.severity === "HIGH"
                ? "HIGH"
                : discrepancy.severity === "MEDIUM"
                  ? "MEDIUM"
                  : "LOW",
          })
          .select("id")
          .single();

        if (ticketError) throw new Error(ticketError.message);

        // Save the AI draft as the first message (outbound draft)
        const { error: msgError } = await serviceClient
          .from("ticket_messages")
          .insert({
            ticket_id: ticket.id,
            direction: "OUTBOUND",
            from_email: process.env.SMTP_USER ?? "noreply@dealscan.ai",
            from_name: "DealScan AI",
            to_emails: "",
            subject,
            body,
            is_draft: true,
          });

        if (msgError) throw new Error(msgError.message);

        await log({
          workflowId,
          actorType: "SYSTEM",
          step: "TICKET_CREATED",
          status: "COMPLETED",
          input: {
            discrepancyId: discrepancy.id,
            field: discrepancy.field,
          },
          output: { ticketId: ticket.id },
          durationMs: Date.now() - start,
        });
      });
    }

    // Step 3: Update workflow status
    // Workflow is HUMAN_REVIEW_REQUIRED while there are unreviewed DISCREPANCY items,
    // RESOLVED when all have been reviewed (approved or rejected).
    await step.run("finalize-workflow", async () => {
      const { data: unreviewed } = await serviceClient
        .from("discrepancies")
        .select("id")
        .eq("workflow_id", workflowId)
        .eq("status", "DISCREPANCY")
        .is("resolved_by", null);

      const finalStatus =
        (unreviewed?.length ?? 0) > 0 ? "HUMAN_REVIEW_REQUIRED" : "RESOLVED";

      await serviceClient
        .from("workflows")
        .update({ status: finalStatus, updated_at: new Date().toISOString() })
        .eq("id", workflowId);
    });
  },
);
