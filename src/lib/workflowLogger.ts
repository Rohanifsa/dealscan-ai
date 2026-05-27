import { serviceClient } from "@/lib/supabase/service";

interface LogParams {
  workflowId: string;
  actorType: "HUMAN" | "SYSTEM";
  actorId?: string | null;
  step: string;
  status: "STARTED" | "COMPLETED" | "FAILED" | "SKIPPED";
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  error?: string | null;
  durationMs?: number | null;
}

/**
 * Inserts a row into workflow_logs using the service role client (bypasses RLS).
 * Used in all Inngest steps and tRPC mutations.
 */
export async function log(params: LogParams): Promise<void> {
  const { error } = await serviceClient.from("workflow_logs").insert({
    workflow_id: params.workflowId,
    actor_type: params.actorType,
    actor_id: params.actorId ?? null,
    step: params.step,
    status: params.status,
    input: params.input ?? null,
    output: params.output ?? null,
    error: params.error ?? null,
    duration_ms: params.durationMs ?? null,
  });

  if (error) {
    console.error("[workflowLogger] Failed to insert log:", error.message);
  }
}
