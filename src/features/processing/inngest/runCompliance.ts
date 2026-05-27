import { inngest } from "@/server/inngest/client";
import { serviceClient } from "@/lib/supabase/service";
import { flashLite } from "@/lib/gemini";
import { log } from "@/lib/workflowLogger";
import { ucpRules } from "@/lib/compliance/ucpRules";
import { tokenSetRatio, getVerdict } from "@/lib/compliance/fuzzyMatch";
import { getSeverity } from "@/lib/compliance/severityScorer";
import { generateText } from "ai";

interface ExtractedDoc {
  id: string;
  type: string;
  extracted_json: Record<string, string> | null;
}

export const runCompliance = inngest.createFunction(
  {
    id: "run-compliance",
    name: "Run Diligence Checks",
    triggers: [{ event: "trade/extraction.complete" }],
  },
  async ({
    event,
    step,
  }: {
    event: { data: { workflowId: string } };
    step: any;
  }) => {
    const { workflowId } = event.data as { workflowId: string };

    // Step 1: Fetch extracted documents
    const documents = await step.run("fetch-extracted-docs", async () => {
      const { data, error } = await serviceClient
        .from("documents")
        .select("id, type, extracted_json")
        .eq("workflow_id", workflowId);

      if (error) throw new Error(error.message);
      return (data ?? []) as ExtractedDoc[];
    });

    // Step 2: Update status to VALIDATING
    await step.run("update-status-validating", async () => {
      await serviceClient
        .from("workflows")
        .update({ status: "VALIDATING", updated_at: new Date().toISOString() })
        .eq("id", workflowId);

      await log({
        workflowId,
        actorType: "SYSTEM",
        step: "COMPLIANCE_STARTED",
        status: "STARTED",
      });
    });

    const cimDoc = documents.find((d: any) => d.type === "LC");
    if (!cimDoc?.extracted_json) {
      await log({
        workflowId,
        actorType: "SYSTEM",
        step: "COMPLIANCE_COMPLETE",
        status: "FAILED",
        error: "CIM document not found or not extracted",
      });
      await serviceClient
        .from("workflows")
        .update({ status: "FAILED" })
        .eq("id", workflowId);
      return;
    }

    // Step 3: Run diligence checks for each PE rule in parallel
    const results = await Promise.all(
      ucpRules.map(async (rule) => {
        const compareDoc = documents.find(
          (d: any) => d.type === rule.compareDocType,
        );
        if (!compareDoc?.extracted_json) return null;

        const lcValue = String(cimDoc.extracted_json![rule.field] ?? "");
        const docValue = String(compareDoc.extracted_json[rule.field] ?? "");

        if (!lcValue && !docValue) return null;

        // Rules engine check
        const rulesResult = await step.run(
          `compliance-rules-${rule.field}-${compareDoc.id}`,
          async () => {
            const score = tokenSetRatio(lcValue, docValue);
            const { verdict } = getVerdict(score);

            await log({
              workflowId,
              actorType: "SYSTEM",
              step: "COMPLIANCE_RULES_ENGINE",
              status: "COMPLETED",
              input: { field: rule.field, cimValue: lcValue, docValue },
              output: { score, verdict },
            });

            return { score, verdict };
          },
        );

        // Gemini semantic check (only when score is borderline 60–85)
        let aiVerdict: "PASS" | "FAIL" = rulesResult.verdict;
        let aiConfidence = rulesResult.score;
        let aiReasoning = "";

        if (rulesResult.score >= 60 && rulesResult.score < 85) {
          const aiResult = await step.run(
            `compliance-gemini-${rule.field}-${compareDoc.id}`,
            async () => {
              const start = Date.now();
              try {
                const { text } = await generateText({
                  model: flashLite,
                  messages: [
                    {
                      role: "user",
                      content: `You are a private equity due diligence analyst. Compare these two field values under ${rule.ucpArticle}.

Field: ${rule.field}
CIM / Source Value: "${lcValue}"
Document Value: "${docValue}"

Determine if they match semantically. Consider abbreviations, formatting differences, financial statement presentation, and common private equity diligence conventions.

Respond in JSON: { "match": true/false, "confidence": 0-100, "reason": "brief explanation" }
Return ONLY valid JSON.`,
                    },
                  ],
                });

                let parsed: {
                  match?: boolean;
                  confidence?: number;
                  reason?: string;
                } = {};
                try {
                  parsed = JSON.parse(text) as typeof parsed;
                } catch {
                  parsed = {
                    match: false,
                    confidence: 50,
                    reason: "Parse error",
                  };
                }

                await log({
                  workflowId,
                  actorType: "SYSTEM",
                  step: "COMPLIANCE_GEMINI_SEMANTIC",
                  status: "COMPLETED",
                  input: {
                    field: rule.field,
                    cimValue: lcValue,
                    docValue,
                    score: rulesResult.score,
                  },
                  output: parsed,
                  durationMs: Date.now() - start,
                });

                return parsed;
              } catch (err) {
                await log({
                  workflowId,
                  actorType: "SYSTEM",
                  step: "COMPLIANCE_GEMINI_SEMANTIC",
                  status: "FAILED",
                  error: err instanceof Error ? err.message : "Unknown",
                  durationMs: Date.now() - start,
                });
                return {
                  match: false,
                  confidence: 50,
                  reason: "AI check failed",
                };
              }
            },
          );

          aiVerdict = aiResult.match ? "PASS" : "FAIL";
          aiConfidence = aiResult.confidence ?? 50;
          aiReasoning = aiResult.reason ?? "";
        }

        // Consensus decision
        const discrepancy = await step.run(
          `consensus-${rule.field}-${compareDoc.id}`,
          async () => {
            const rulesPassed = rulesResult.verdict === "PASS";
            const aiPassed = aiVerdict === "PASS";

            const status: "APPROVED" | "DISCREPANCY" =
              rulesPassed && aiPassed ? "APPROVED" : "DISCREPANCY";

            const { level: severity, score: severityScore } = getSeverity(
              rule.field,
              rulesPassed,
              aiPassed,
            );

            const { data, error } = await serviceClient
              .from("discrepancies")
              .insert({
                workflow_id: workflowId,
                source_doc_id: cimDoc.id,
                compare_doc_id: compareDoc.id,
                field: rule.field,
                lc_value: lcValue,
                document_value: docValue,
                ucp_article: rule.ucpArticle,
                rules_verdict: rulesResult.verdict,
                fuzzy_score: rulesResult.score,
                ai_verdict: aiVerdict,
                ai_confidence: aiConfidence,
                ai_reasoning: aiReasoning || null,
                severity,
                severity_score: severityScore,
                status,
              })
              .select()
              .single();

            if (error) throw new Error(error.message);

            await log({
              workflowId,
              actorType: "SYSTEM",
              step: "COMPLIANCE_CONSENSUS",
              status: "COMPLETED",
              output: {
                field: rule.field,
                rulesVerdict: rulesResult.verdict,
                aiVerdict,
                status,
                severity,
              },
            });

            return data;
          },
        );

        return discrepancy;
      }),
    );

    // Step 4: Update workflow status and log summary
    await step.run("finalize-compliance", async () => {
      const validResults = results.filter(Boolean);

      await serviceClient
        .from("workflows")
        .update({ status: "VALIDATING", updated_at: new Date().toISOString() })
        .eq("id", workflowId);

      await log({
        workflowId,
        actorType: "SYSTEM",
        step: "COMPLIANCE_COMPLETE",
        status: "COMPLETED",
        output: {
          totalChecks: validResults.length,
          discrepancies: validResults.filter((r) => r?.status === "DISCREPANCY")
            .length,
          approved: validResults.filter((r) => r?.status === "APPROVED").length,
        },
      });
    });

    // Trigger management query generation
    await step.sendEvent("trigger-swift", {
      name: "trade/compliance.complete",
      data: { workflowId },
    });
  },
);
