import { inngest } from "@/server/inngest/client";
import { serviceClient } from "@/lib/supabase/service";
import { flashLite } from "@/lib/gemini";
import { log } from "@/lib/workflowLogger";
import {
  generateText,
  Output,
  wrapLanguageModel,
  extractJsonMiddleware,
} from "ai";
import { z } from "zod";

// Zod schema matching the PE diligence fields stored in documents.extracted_json
const tradeDocSchema = z.object({
  company_name: z.string().nullable(),
  sector: z.string().nullable(),
  reporting_period: z.string().nullable(),
  revenue: z.string().nullable(),
  ebitda: z.string().nullable(),
  gross_margin: z.string().nullable(),
  capex: z.string().nullable(),
  net_debt: z.string().nullable(),
  cash_balance: z.string().nullable(),
  debt_balance: z.string().nullable(),
  working_capital: z.string().nullable(),
  customer_concentration: z.string().nullable(),
  ownership_percentage: z.string().nullable(),
  option_pool: z.string().nullable(),
  management_guidance: z.string().nullable(),
  transaction_assumptions: z.string().nullable(),
  valuation_multiple: z.string().nullable(),
  enterprise_value: z.string().nullable(),
  currency: z.string().nullable(),
  key_customers: z.string().nullable(),
  key_risks: z.string().nullable(),
});

// Gemini wraps JSON in markdown code fences — extractJsonMiddleware strips them
// so Output.object() can parse the result correctly.
const extractModel = wrapLanguageModel({
  model: flashLite,
  middleware: extractJsonMiddleware(),
});

export const extractDocuments = inngest.createFunction(
  {
    id: "extract-documents",
    name: "Extract Documents",
    triggers: [{ event: "trade/workflow.triggered" }],
  },
  async ({
    event,
    step,
  }: {
    event: { data: { workflowId: string } };
    step: any;
  }) => {
    const { workflowId } = event.data as { workflowId: string };

    // Step 1: Update workflow status to EXTRACTING
    await step.run("update-workflow-status", async () => {
      await serviceClient
        .from("workflows")
        .update({ status: "EXTRACTING", updated_at: new Date().toISOString() })
        .eq("id", workflowId);

      await log({
        workflowId,
        actorType: "SYSTEM",
        step: "EXTRACTION_STARTED",
        status: "STARTED",
      });
    });

    // Step 2: Fetch documents
    const documents = await step.run("fetch-documents", async () => {
      const { data, error } = await serviceClient
        .from("documents")
        .select("*")
        .eq("workflow_id", workflowId);

      if (error) throw new Error(error.message);
      return data ?? [];
    });

    // Step 3: Extract each document in parallel — PDF sent directly to Gemini
    await Promise.all(
      documents.map(async (doc: any) => {
        const docId = doc.id;

        const extractedJson = await step.run(
          `gemini-extract-${docId}`,
          async () => {
            const start = Date.now();

            // Download PDF from Supabase storage
            const storagePrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trade-documents/`;
            const storagePath = doc.file_url.startsWith(storagePrefix)
              ? doc.file_url.slice(storagePrefix.length)
              : doc.file_url;

            const { data: fileData, error: dlError } =
              await serviceClient.storage
                .from("trade-documents")
                .download(storagePath);

            if (dlError || !fileData)
              throw new Error(
                `Failed to download document: ${dlError?.message ?? "no data"}`,
              );

            const base64 = Buffer.from(await fileData.arrayBuffer()).toString(
              "base64",
            );

            const { output } = await generateText({
              model: extractModel,
              output: Output.object({ schema: tradeDocSchema }),
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "file" as const,
                      data: base64,
                      mediaType: "application/pdf",
                    },
                    {
                      type: "text" as const,
                      text: `You are a private equity due diligence analyst. Extract all key investment, financial, ownership, and operating fields from this ${doc.type} deal document.

Return null for any field not present in the document. Use exact values as written — do not paraphrase or infer missing fields. Dates should be in their original format. Currency and quantity exactly as written.`,
                    },
                  ],
                },
              ],
            });

            await log({
              workflowId,
              actorType: "SYSTEM",
              step: "EXTRACTION_GEMINI",
              status: "COMPLETED",
              input: { docId },
              output: {
                fieldCount: Object.keys(output ?? {}).filter(
                  (k) => output?.[k as keyof typeof output] !== null,
                ).length,
              },
              durationMs: Date.now() - start,
            });

            return output;
          },
        );

        // Save extraction results
        await step.run(`save-extracted-${docId}`, async () => {
          await serviceClient
            .from("documents")
            .update({
              raw_text: null,
              extracted_json: extractedJson,
              ocr_repaired: false,
            })
            .eq("id", docId);
        });
      }),
    );

    // Step 4: Log completion and trigger compliance
    await step.run("finalize-extraction", async () => {
      await log({
        workflowId,
        actorType: "SYSTEM",
        step: "EXTRACTION_COMPLETE",
        status: "COMPLETED",
      });
    });

    await step.sendEvent("trigger-compliance", {
      name: "trade/extraction.complete",
      data: { workflowId },
    });
  },
);
