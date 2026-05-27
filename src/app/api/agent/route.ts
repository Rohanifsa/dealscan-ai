import { createAgentUIStreamResponse } from "ai";
import { createServerClient } from "@/lib/supabase/server";
import { createDealScanAgent } from "@/lib/agents/trade-guard-agent";
import type { PageContext } from "@/lib/agents/trade-guard-agent";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages, pageContext } = (await request.json()) as {
    messages: unknown[];
    pageContext?: PageContext;
  };

  const agent = createDealScanAgent(supabase, user.id, pageContext);

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
  });
}
