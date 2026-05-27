import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { getAccessToken, watchInbox } from "@/lib/gmail";

/**
 * POST /api/gmail/watch
 *
 * Bootstraps gmail.users.watch() — must be called once to start the Pub/Sub
 * push pipeline. Re-call whenever the watch expires (or let the Inngest cron
 * handle renewal every 6 days).
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth || auth !== `Bearer ${process.env.GMAIL_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  try {
    const result = await watchInbox(accessToken);

    await serviceClient.from("gmail_watch_state").upsert(
      {
        id: 1,
        history_id: result.historyId,
        expiration: new Date(parseInt(result.expiration)).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    return NextResponse.json({
      ok: true,
      historyId: result.historyId,
      expiresAt: new Date(parseInt(result.expiration)).toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
